"""Tests de `ActividadService` contra la base de datos de tests."""

from datetime import date, timedelta

from sqlalchemy import select

from app import db
from app.models.pago import Pago, PagoEstado
from app.models.reserva import MotivoCancelacion
from app.services.actividad_service import ActividadService

svc = ActividadService()


def _pagos_por_estado(reserva_id, estado):
    stmt = select(Pago).where(
        Pago.reserva_id == reserva_id, Pago.estado == estado
    )
    return db.session.execute(stmt).scalars().all()


class TestEliminar:
    def test_elimina_actividad_y_turnos(self, make_actividad, make_turno):
        actividad = make_actividad()
        turno = make_turno(actividad)

        eliminada = svc.eliminar(actividad.id)

        assert eliminada.is_deleted
        assert turno.is_deleted

    def test_reserva_pagada_se_cancela_y_reembolsa(
        self, make_actividad, make_turno, make_user, make_reserva, make_pago
    ):
        actividad = make_actividad()
        turno = make_turno(actividad)
        user = make_user()
        reserva = make_reserva(user, turno, date.today() + timedelta(days=5))
        make_pago(user, reserva, "1000.00", PagoEstado.PAGADO)

        svc.eliminar(actividad.id)

        assert reserva.is_deleted
        assert reserva.motivo_cancelacion == MotivoCancelacion.REEMBOLSADO
        reembolsos = _pagos_por_estado(reserva.id, PagoEstado.REEMBOLSADO)
        assert len(reembolsos) == 1
        assert reembolsos[0].monto == 1000

    def test_reserva_pasada_queda_intacta(
        self, make_actividad, make_turno, make_user, make_reserva
    ):
        actividad = make_actividad()
        turno = make_turno(actividad)
        reserva = make_reserva(make_user(), turno, date.today() - timedelta(days=5))

        svc.eliminar(actividad.id)

        assert not reserva.is_deleted
        assert reserva.motivo_cancelacion is None

    def test_actividad_inexistente_devuelve_none(self, db_session):
        assert svc.eliminar(9999) is None
