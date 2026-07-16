"""Tests de `ListaEsperaService` y del alta en lista de espera.

Cubren la cola (prioridad mensual + FIFO), la promoción al liberarse un lugar,
la ventana de oferta, el vencimiento y la confirmación al pagar. El envío de
email se anula: la oferta debe persistir sin depender del transporte.
"""

from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from freezegun import freeze_time

from app import db
from app.models.pago import PagoEstado
from app.models.reserva import EstadoEspera, ReservaTipo
from app.models.turno import DiaSemana
from app.models.user import UserRole
from app.services.lista_espera_service import (
    LISTA_ESPERA_TOPE_AVISO,
    ListaEsperaService,
)
from app.services.reserva_service import CupoLlenoError, ReservaService

reserva_svc = ReservaService()
lista_svc = ListaEsperaService()


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    monkeypatch.setattr(
        "app.services.lista_espera_service.send_lista_espera_email",
        lambda *a, **k: None,
    )


@pytest.fixture
def lleno(make_user, make_actividad, make_turno, make_reserva, next_date_for):
    """Turno de cupo 1 lleno por un ocupante, en la próxima fecha del turno."""
    dueno = make_user()
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad, dia_semana=DiaSemana.LUNES, cupo=1)
    fecha = next_date_for(DiaSemana.LUNES)
    ocupante = make_reserva(dueno, turno, fecha)
    return SimpleNamespace(
        actividad=actividad, turno=turno, fecha=fecha, ocupante=ocupante
    )


def _liberar(lleno):
    """Cancela al ocupante y dispara la promoción, como hace la ruta."""
    reserva_svc.cancelar_reserva(lleno.ocupante.id)
    lista_svc.promover(lleno.turno.id, lleno.fecha, motivo="cancelacion")


class TestUnirse:
    def test_eventual_turno_lleno_crea_esperando(self, lleno, make_user):
        waiter = make_user()
        reservas = reserva_svc.unirse_lista_espera(
            waiter.id, lleno.turno.id, lleno.fecha
        )
        assert len(reservas) == 1
        assert reservas[0].estado_espera == EstadoEspera.ESPERANDO

    def test_con_lugar_disponible_falla(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        actividad = make_actividad()
        turno = make_turno(actividad, cupo=5)
        fecha = next_date_for(DiaSemana.LUNES)
        waiter = make_user()
        with pytest.raises(ValueError, match="lugar disponible"):
            reserva_svc.unirse_lista_espera(waiter.id, turno.id, fecha)

    def test_duplicado_falla(self, lleno, make_user):
        # Anotarse dos veces al mismo turno lo bloquea la validación de horario
        # (una fila en espera cuenta como turno del usuario en ese horario).
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)
        with pytest.raises(ValueError, match="horario"):
            reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)

    def test_mensual_entra_si_una_fecha_esta_llena(self, lleno, make_user):
        waiter = make_user()
        reservas = reserva_svc.unirse_lista_espera(
            waiter.id, lleno.turno.id, lleno.fecha, ReservaTipo.MENSUAL
        )
        assert len(reservas) >= 1
        assert all(r.estado_espera == EstadoEspera.ESPERANDO for r in reservas)
        assert len({r.grupo_id for r in reservas}) == 1


class TestPrioridad:
    def test_mensual_supera_a_eventual_anotado_antes(self, lleno, make_user):
        eventual = make_user()
        reserva_svc.unirse_lista_espera(eventual.id, lleno.turno.id, lleno.fecha)
        mensual = make_user()
        grupo = reserva_svc.unirse_lista_espera(
            mensual.id, lleno.turno.id, lleno.fecha, ReservaTipo.MENSUAL
        )

        _liberar(lleno)

        # El abono mensual recibe la oferta; la eventual sigue esperando.
        assert all(
            r.estado_espera == EstadoEspera.OFERTADO
            for r in grupo
            if r.fecha == lleno.fecha
        )
        eventual_filas = [
            r for r in lleno.turno.reservas if r.user_id == eventual.id
        ]
        assert eventual_filas[0].estado_espera == EstadoEspera.ESPERANDO


class TestPromoverYOferta:
    def test_oferta_marca_ofertado_y_retiene_cupo(self, lleno, make_user):
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)

        _liberar(lleno)

        fila = [r for r in lleno.turno.reservas if r.user_id == waiter.id][0]
        assert fila.estado_espera == EstadoEspera.OFERTADO
        assert fila.oferta_expira_at is not None
        # El hold vuelve a dejar el turno sin cupo: no se puede reservar directo.
        otro = make_user()
        with pytest.raises(CupoLlenoError):
            reserva_svc.crear_reserva(otro.id, lleno.turno.id, lleno.fecha)

    def test_strict_wait_mensual_no_ofrece_a_nadie(
        self, make_user, make_actividad, make_turno, make_reserva, next_date_for
    ):
        # Dos fechas del mes; una llena y otra no, así el abono no entra completo.
        # Reloj anclado a comienzos de julio: si no, según la fecha real las dos
        # fechas caerían en meses distintos y el abono no las abarcaría.
        with freeze_time("2026-07-01"):
            dueno = make_user()
            actividad = make_actividad()
            turno = make_turno(actividad, dia_semana=DiaSemana.LUNES, cupo=1)
            f1 = next_date_for(DiaSemana.LUNES)
            f2 = f1 + timedelta(days=7)
            ocup1 = make_reserva(dueno, turno, f1)
            make_reserva(dueno, turno, f2)  # segunda fecha también llena

            waiter = make_user()
            reserva_svc.unirse_lista_espera(
                waiter.id, turno.id, f1, ReservaTipo.MENSUAL
            )

            # Se libera solo f1; el abono necesita f2 (sigue llena) → nadie ofertado.
            reserva_svc.cancelar_reserva(ocup1.id)
            lista_svc.promover(turno.id, f1, motivo="cancelacion")

            filas = [r for r in turno.reservas if r.user_id == waiter.id]
            assert all(r.estado_espera == EstadoEspera.ESPERANDO for r in filas)
            # Y un walk-in no puede tomar el lugar que espera el abono.
            otro = make_user()
            with pytest.raises(CupoLlenoError):
                reserva_svc.crear_reserva(otro.id, turno.id, f1)


class TestVencimiento:
    def test_expirar_pasa_al_siguiente_sin_rearmar(self, lleno, make_user):
        primero = make_user()
        reserva_svc.unirse_lista_espera(primero.id, lleno.turno.id, lleno.fecha)
        segundo = make_user()
        reserva_svc.unirse_lista_espera(segundo.id, lleno.turno.id, lleno.fecha)

        _liberar(lleno)  # primero queda OFERTADO

        with freeze_time(datetime.now(timezone.utc) + timedelta(hours=2)):
            lista_svc.expirar_ofertas()

        f_primero = [r for r in lleno.turno.reservas if r.user_id == primero.id][0]
        f_segundo = [r for r in lleno.turno.reservas if r.user_id == segundo.id][0]
        assert f_primero.estado_espera == EstadoEspera.VENCIDO
        assert f_segundo.estado_espera == EstadoEspera.OFERTADO

    def test_rearma_vencido_solo_con_cancelacion_real(self, lleno, make_user):
        uno = make_user()
        reserva_svc.unirse_lista_espera(uno.id, lleno.turno.id, lleno.fecha)
        _liberar(lleno)  # uno OFERTADO

        with freeze_time(datetime.now(timezone.utc) + timedelta(hours=2)):
            lista_svc.expirar_ofertas()  # uno → VENCIDO, no hay siguiente
        fila = [r for r in lleno.turno.reservas if r.user_id == uno.id][0]
        assert fila.estado_espera == EstadoEspera.VENCIDO

        # Una cancelación real re-arma al vencido y vuelve a ofrecerle el lugar.
        lista_svc.promover(lleno.turno.id, lleno.fecha, motivo="cancelacion")
        fila = [r for r in lleno.turno.reservas if r.user_id == uno.id][0]
        assert fila.estado_espera == EstadoEspera.OFERTADO


class TestConfirmarLugar:
    def test_confirmar_limpia_estado(self, lleno, make_user):
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)
        _liberar(lleno)

        fila = [r for r in lleno.turno.reservas if r.user_id == waiter.id][0]
        lista_svc.confirmar_lugar(fila)
        assert fila.estado_espera is None
        assert fila.oferta_expira_at is None


class TestAvisoAdmins:
    """El alta a la lista avisa al staff recién cuando la cola llega al tope."""

    @pytest.fixture
    def capturar_admin(self, monkeypatch):
        enviados = []
        monkeypatch.setattr(
            "app.services.lista_espera_service.send_lista_espera_admin_email",
            lambda email, **kw: enviados.append((email, kw)),
        )
        return enviados

    def _anotar(self, cantidad, lleno, make_user):
        for _ in range(cantidad):
            reserva_svc.unirse_lista_espera(make_user().id, lleno.turno.id, lleno.fecha)

    def test_no_avisa_antes_del_tope(self, lleno, make_user, capturar_admin):
        make_user(role=UserRole.ADMIN)
        self._anotar(LISTA_ESPERA_TOPE_AVISO - 1, lleno, make_user)
        assert capturar_admin == []

    def test_avisa_al_llegar_al_tope_con_actividad_y_fecha(
        self, lleno, make_user, capturar_admin
    ):
        admin = make_user(role=UserRole.ADMIN)
        self._anotar(LISTA_ESPERA_TOPE_AVISO, lleno, make_user)

        assert len(capturar_admin) == 1
        email, kw = capturar_admin[0]
        assert email == admin.email
        assert kw["actividad"] == lleno.actividad.nombre
        assert kw["fecha_label"] == lleno.fecha.strftime("%d/%m")
        hora = lleno.turno.hora.strftime("%H:%M")
        assert kw["turno_label"] == f"lunes {hora}"
        assert kw["cantidad"] == LISTA_ESPERA_TOPE_AVISO

    def test_avisa_a_cada_admin_y_no_a_clientes(
        self, lleno, make_user, capturar_admin
    ):
        make_user(role=UserRole.ADMIN)
        make_user(role=UserRole.ADMIN)
        self._anotar(LISTA_ESPERA_TOPE_AVISO, lleno, make_user)
        assert len(capturar_admin) == 2

    def test_no_reavisa_pasado_el_tope(self, lleno, make_user, capturar_admin):
        make_user(role=UserRole.ADMIN)
        self._anotar(LISTA_ESPERA_TOPE_AVISO + 1, lleno, make_user)
        assert len(capturar_admin) == 1


class TestHoldEnLaCola:
    def test_un_lugar_retenido_por_hold_no_se_oferta(
        self, make_user, make_actividad, make_turno, make_pago
    ):
        # El hold del abonado llena la fecha futura: el walk-in no reserva
        # directo (se anota en la lista) y la promoción no le oferta ese lugar,
        # que está reservado para la renovación del abono.
        abonado, esperando = make_user(), make_user()
        turno = make_turno(
            make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES, cupo=1
        )
        with freeze_time("2026-07-01"):
            reservas = reserva_svc.crear_reserva_mensual(
                abonado.id, turno.id, date(2026, 7, 6)
            )
        make_pago(abonado, reservas[0], "1000.00", PagoEstado.PAGADO)

        fecha_futura = date(2026, 8, 3)
        assert lista_svc.hay_lugar(turno, fecha_futura) is False

        with freeze_time("2026-07-02"):
            fila = reserva_svc.unirse_lista_espera(
                esperando.id, turno.id, fecha_futura
            )[0]
        lista_svc.promover(turno.id, fecha_futura, motivo="cancelacion")
        db.session.refresh(fila)
        assert fila.estado_espera == EstadoEspera.ESPERANDO
