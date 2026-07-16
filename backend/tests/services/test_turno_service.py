"""Tests de `TurnoService` contra la base de datos de tests."""

from datetime import date, time, timedelta
from unittest.mock import MagicMock

import pytest
from freezegun import freeze_time
from sqlalchemy import select

from app import db
from app.models.pago import Pago, PagoEstado
from app.models.reserva import EstadoEspera, MotivoCancelacion, ReservaTipo
from app.models.turno import DiaSemana
from app.models.turno_fecha_bloqueada import TurnoFechaBloqueada
from app.services.reserva_service import ReservaService
from app.services.turno_service import TurnoService

svc = TurnoService()
reserva_svc = ReservaService()


def _pagos_por_estado(reserva_id, estado):
    stmt = select(Pago).where(
        Pago.reserva_id == reserva_id, Pago.estado == estado
    )
    return db.session.execute(stmt).scalars().all()


def _data(actividad, dia=DiaSemana.LUNES, hora=time(16, 0), cupo=10):
    return {"actividad_id": actividad.id, "dia_semana": dia, "hora": hora, "cupo": cupo}


class TestCrearTurno:
    def test_crear_ok(self, make_actividad):
        actividad = make_actividad()
        turno = svc.crear_turno(_data(actividad))
        assert turno.id is not None
        assert turno.cupo == 10

    def test_conflicto_misma_actividad(self, make_actividad):
        actividad = make_actividad()
        svc.crear_turno(_data(actividad, hora=time(16, 0)))
        with pytest.raises(ValueError, match="Ya existe un turno"):
            svc.crear_turno(_data(actividad, hora=time(16, 30)))

    def test_distinta_actividad_no_choca(self, make_actividad):
        a1, a2 = make_actividad(), make_actividad()
        svc.crear_turno(_data(a1, hora=time(16, 0)))
        # Otra actividad en el mismo día y horario cercano: no choca.
        turno = svc.crear_turno(_data(a2, hora=time(16, 30)))
        assert turno.id is not None


class TestActualizar:
    def test_bajar_cupo_por_debajo_de_reservas_falla(
        self, make_actividad, make_turno, make_user, make_reserva
    ):
        turno = make_turno(make_actividad(), cupo=3)
        fecha = date.today() + timedelta(days=7)
        # Dos reservas en la misma sesión futura (distintos usuarios por el índice único).
        make_reserva(make_user(), turno, fecha)
        make_reserva(make_user(), turno, fecha)

        data = {"dia_semana": turno.dia_semana, "hora": turno.hora, "cupo": 1}
        with pytest.raises(ValueError, match="2 Reservas"):
            svc.actualizar(turno.id, data)

    def test_bajar_cupo_hasta_el_maximo_permitido(
        self, make_actividad, make_turno, make_user, make_reserva
    ):
        turno = make_turno(make_actividad(), cupo=3)
        fecha = date.today() + timedelta(days=7)
        make_reserva(make_user(), turno, fecha)
        make_reserva(make_user(), turno, fecha)

        data = {"dia_semana": turno.dia_semana, "hora": turno.hora, "cupo": 2}
        actualizado = svc.actualizar(turno.id, data)
        assert actualizado.cupo == 2

    def test_turno_inexistente_devuelve_none(self, make_actividad):
        data = {"dia_semana": DiaSemana.LUNES, "hora": time(10, 0), "cupo": 5}
        assert svc.actualizar(9999, data) is None

    def test_subir_cupo_promueve_y_notifica_lista_espera(
        self, make_actividad, make_turno, make_user, make_reserva, next_date_for,
        monkeypatch,
    ):
        # Turno lleno (cupo 1) con un cliente esperando: subir el cupo debe
        # ofrecerle el lugar nuevo y avisarle, igual que una cancelación.
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=1)
        fecha = next_date_for(DiaSemana.LUNES)
        make_reserva(make_user(), turno, fecha)
        waiter = make_user()
        espera = reserva_svc.unirse_lista_espera(waiter.id, turno.id, fecha)[0]
        assert espera.estado_espera == EstadoEspera.ESPERANDO

        aviso = MagicMock()
        monkeypatch.setattr(
            "app.services.lista_espera_service.send_lista_espera_email", aviso
        )
        data = {"dia_semana": turno.dia_semana, "hora": turno.hora, "cupo": 2}
        svc.actualizar(turno.id, data)

        assert espera.estado_espera == EstadoEspera.OFERTADO
        assert espera.oferta_expira_at is not None
        assert aviso.called

    def test_subir_cupo_sin_demanda_no_notifica(
        self, make_actividad, make_turno, make_user, make_reserva, next_date_for,
        monkeypatch,
    ):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=1)
        fecha = next_date_for(DiaSemana.LUNES)
        make_reserva(make_user(), turno, fecha)

        aviso = MagicMock()
        monkeypatch.setattr(
            "app.services.lista_espera_service.send_lista_espera_email", aviso
        )
        data = {"dia_semana": turno.dia_semana, "hora": turno.hora, "cupo": 3}
        svc.actualizar(turno.id, data)

        assert not aviso.called


class TestEliminar:
    def test_sin_reservas_se_elimina(self, make_actividad, make_turno):
        turno = make_turno(make_actividad())
        eliminado = svc.eliminar(turno.id)
        assert eliminado.is_deleted

    def test_reserva_pasada_queda_intacta(self, make_actividad, make_turno, make_user, make_reserva):
        turno = make_turno(make_actividad())
        reserva = make_reserva(make_user(), turno, date.today() - timedelta(days=5))
        eliminado = svc.eliminar(turno.id)
        assert eliminado.is_deleted
        assert not reserva.is_deleted
        assert reserva.motivo_cancelacion is None

    def test_reserva_pagada_se_cancela_y_reembolsa(
        self, make_actividad, make_turno, make_user, make_reserva, make_pago
    ):
        turno = make_turno(make_actividad())
        user = make_user()
        reserva = make_reserva(user, turno, date.today() + timedelta(days=5))
        make_pago(user, reserva, "1000.00", PagoEstado.PAGADO)

        eliminado = svc.eliminar(turno.id)

        assert eliminado.is_deleted
        assert reserva.is_deleted
        assert reserva.motivo_cancelacion == MotivoCancelacion.REEMBOLSADO
        reembolsos = _pagos_por_estado(reserva.id, PagoEstado.REEMBOLSADO)
        assert len(reembolsos) == 1
        assert reembolsos[0].monto == 1000

    def test_reserva_senada_reembolsa_la_sena(
        self, make_actividad, make_turno, make_user, make_reserva, make_pago
    ):
        turno = make_turno(make_actividad())
        user = make_user()
        reserva = make_reserva(user, turno, date.today() + timedelta(days=5))
        make_pago(user, reserva, "500.00", PagoEstado.SENADO)

        svc.eliminar(turno.id)

        reembolsos = _pagos_por_estado(reserva.id, PagoEstado.REEMBOLSADO)
        assert len(reembolsos) == 1
        assert reembolsos[0].monto == 500

    def test_reserva_pendiente_se_cancela_sin_reembolso(
        self, make_actividad, make_turno, make_user, make_reserva
    ):
        turno = make_turno(make_actividad())
        reserva = make_reserva(make_user(), turno, date.today() + timedelta(days=5))

        svc.eliminar(turno.id)

        assert reserva.is_deleted
        assert reserva.motivo_cancelacion == MotivoCancelacion.CANCELADO
        assert _pagos_por_estado(reserva.id, PagoEstado.REEMBOLSADO) == []


# La baja puntual solo admite fechas del mes en curso; se congela el "ahora" a
# principio de mes para que `next_date_for` (7+ días adelante) caiga dentro.
@freeze_time("2026-07-01 12:00:00")
class TestEliminarFecha:
    def test_bloquea_la_fecha(self, make_actividad, make_turno, make_user, next_date_for):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)

        resultado = svc.eliminar_fecha(turno.id, fecha, make_user().id)

        assert resultado is not None
        assert not resultado.is_deleted
        stmt = select(TurnoFechaBloqueada).where(
            TurnoFechaBloqueada.turno_id == turno.id,
            TurnoFechaBloqueada.fecha == fecha,
        )
        assert db.session.execute(stmt).scalars().first() is not None

    def test_reembolsa_solo_las_reservas_de_esa_fecha(
        self, make_actividad, make_turno, make_user, make_reserva, make_pago, next_date_for
    ):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        user = make_user()
        fecha = next_date_for(DiaSemana.LUNES)
        otra_fecha = fecha + timedelta(days=7)
        afectada = make_reserva(user, turno, fecha)
        intacta = make_reserva(user, turno, otra_fecha)
        make_pago(user, afectada, "1000.00", PagoEstado.PAGADO)
        make_pago(user, intacta, "1000.00", PagoEstado.PAGADO)

        svc.eliminar_fecha(turno.id, fecha, user.id)

        assert afectada.is_deleted
        assert afectada.motivo_cancelacion == MotivoCancelacion.REEMBOLSADO
        assert len(_pagos_por_estado(afectada.id, PagoEstado.REEMBOLSADO)) == 1
        assert not intacta.is_deleted
        assert _pagos_por_estado(intacta.id, PagoEstado.REEMBOLSADO) == []

    def test_clase_mensual_reembolsa_solo_esa_clase(
        self, make_actividad, make_turno, make_user, make_reserva, make_pago, next_date_for
    ):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        user = make_user()
        fecha = next_date_for(DiaSemana.LUNES)
        clase1 = make_reserva(user, turno, fecha, tipo=ReservaTipo.MENSUAL)
        clase2 = make_reserva(
            user, turno, fecha + timedelta(days=7), tipo=ReservaTipo.MENSUAL
        )
        clase1.grupo_id = clase2.grupo_id = "abono-test"
        db.session.commit()
        make_pago(user, clase1, "1000.00", PagoEstado.PAGADO)
        make_pago(user, clase2, "1000.00", PagoEstado.PAGADO)

        svc.eliminar_fecha(turno.id, fecha, user.id)

        assert clase1.is_deleted
        assert len(_pagos_por_estado(clase1.id, PagoEstado.REEMBOLSADO)) == 1
        assert not clase2.is_deleted
        assert _pagos_por_estado(clase2.id, PagoEstado.REEMBOLSADO) == []

    def test_dia_de_semana_incorrecto(self, make_actividad, make_turno, make_user, next_date_for):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        with pytest.raises(ValueError, match="martes"):
            svc.eliminar_fecha(turno.id, next_date_for(DiaSemana.MARTES), make_user().id)

    def test_fecha_pasada(self, make_actividad, make_turno, make_user, past_date_for):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        with pytest.raises(ValueError, match="pasada"):
            svc.eliminar_fecha(turno.id, past_date_for(DiaSemana.LUNES), make_user().id)

    def test_fecha_de_otro_mes(self, make_actividad, make_turno, make_user):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        with pytest.raises(ValueError, match="mes en curso"):
            svc.eliminar_fecha(turno.id, date(2026, 8, 3), make_user().id)

    def test_fecha_ya_bloqueada(self, make_actividad, make_turno, make_user, next_date_for):
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)
        admin_id = make_user().id
        svc.eliminar_fecha(turno.id, fecha, admin_id)
        with pytest.raises(ValueError, match="ya fue dada de baja"):
            svc.eliminar_fecha(turno.id, fecha, admin_id)

    def test_turno_inexistente_devuelve_none(self, db_session, next_date_for):
        assert svc.eliminar_fecha(9999, next_date_for(DiaSemana.LUNES), 1) is None


class TestCupoConHold:
    def test_descuenta_el_hold_solo_en_meses_futuros(
        self, make_user, make_actividad, make_turno, make_pago
    ):
        abonado = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=2)
        with freeze_time("2026-07-01"):
            reservas = reserva_svc.crear_reserva_mensual(
                abonado.id, turno.id, date(2026, 7, 6)
            )
        make_pago(abonado, reservas[0], "1000.00", PagoEstado.PAGADO)

        # Julio (mes del abono): cuenta la fila real. Agosto: cuenta el hold.
        assert svc.lugares_disponibles(turno, date(2026, 7, 13)) == 1
        assert svc.lugares_disponibles(turno, date(2026, 8, 3)) == 1
        assert svc.hay_cupo(turno, date(2026, 8, 3)) is True

    def test_cancelar_una_clase_no_la_reocupa_el_hold(
        self, make_user, make_actividad, make_turno, make_pago
    ):
        abonado = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=2)
        with freeze_time("2026-07-01"):
            reservas = reserva_svc.crear_reserva_mensual(
                abonado.id, turno.id, date(2026, 7, 6)
            )
        make_pago(abonado, reservas[0], "1000.00", PagoEstado.PAGADO)

        reserva_svc.cancelar_reserva(reservas[1].id)
        assert svc.lugares_disponibles(turno, date(2026, 7, 13)) == 2
