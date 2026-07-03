"""Tests de `ListaEsperaService` y del alta en lista de espera.

Cubren la cola (prioridad mensual + FIFO), la promoción al liberarse un lugar,
la ventana de oferta, el vencimiento y la confirmación al pagar. El envío de
email se anula: la oferta debe persistir sin depender del transporte.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from freezegun import freeze_time

from app.models.reserva import EstadoEspera, ReservaTipo
from app.models.turno import DiaSemana
from app.services.lista_espera_service import ListaEsperaService
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
