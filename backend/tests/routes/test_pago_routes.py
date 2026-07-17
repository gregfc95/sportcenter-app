"""Tests de las rutas de pagos.

Cubre el retorno de Mercado Pago con error/cancelación: abandonar el checkout de
un abono mensual nunca pagado da de baja el grupo completo pero **no** penaliza
(regresión de la penalización indebida que se aplicaba al caer en "Pago
Rechazado").
"""

from datetime import date

import pytest
from freezegun import freeze_time
from sqlalchemy import select

import app.routes.pago_routes as pr
from app import db
from app.models.penalizacion import Penalizacion
from app.models.reserva import MotivoCancelacion, Reserva
from app.models.turno import DiaSemana


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    monkeypatch.setattr(
        "app.services.lista_espera_service.send_lista_espera_email",
        lambda *a, **k: None,
    )


def test_cancelar_checkout_mensual_impago_no_penaliza(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno
):
    user = make_user()
    actividad = make_actividad()
    turno = make_turno(actividad, dia_semana=DiaSemana.LUNES, cupo=10)
    # Reloj anclado a comienzos de agosto: si no, según la fecha real las clases
    # del abono quedarían en el pasado y `crear_reserva_mensual` las rechazaría.
    # El 3/8/2026 es lunes → el grupo cubre varias clases del mes.
    with freeze_time("2026-08-01"):
        reservas = pr.reserva_service.crear_reserva_mensual(
            user.id, turno.id, date(2026, 8, 3)
        )
    assert len(reservas) > 1
    grupo_id = reservas[0].grupo_id

    monkeypatch.setattr(pr, "current_user_id", lambda: user.id)
    with app.test_request_context(json={"reserva_id": reservas[0].id}):
        resp, status = pr.cancelar_checkout()

    assert status == 200
    assert resp.get_json() == {"ok": True, "cancelada": True}

    # Todo el grupo quedó dado de baja (hay que pedir las filas soft-deleted).
    grupo = (
        db.session.execute(
            select(Reserva)
            .where(Reserva.grupo_id == grupo_id)
            .execution_options(include_deleted=True)
        )
        .scalars()
        .all()
    )
    assert len(grupo) == len(reservas)
    assert all(r.is_deleted for r in grupo)
    assert all(r.motivo_cancelacion == MotivoCancelacion.CANCELADO for r in grupo)

    # El núcleo del fix: abandonar el checkout no suma ninguna penalización.
    assert (
        db.session.execute(
            select(Penalizacion).where(Penalizacion.user_id == user.id)
        )
        .scalars()
        .all()
        == []
    )


def test_cancelar_checkout_con_pago_no_toca_la_reserva(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno, make_pago
):
    """Si el grupo ya tiene un pago, un retorno con error no lo cancela."""
    from app.models.pago import PagoEstado

    user = make_user()
    actividad = make_actividad()
    turno = make_turno(actividad, dia_semana=DiaSemana.LUNES, cupo=10)
    with freeze_time("2026-08-01"):
        reservas = pr.reserva_service.crear_reserva_mensual(
            user.id, turno.id, date(2026, 8, 3)
        )
    make_pago(user, reservas[0], "1000.00", PagoEstado.PAGADO)

    monkeypatch.setattr(pr, "current_user_id", lambda: user.id)
    with app.test_request_context(json={"reserva_id": reservas[0].id}):
        resp, status = pr.cancelar_checkout()

    assert status == 200
    assert resp.get_json() == {"ok": True, "cancelada": False}

    activas = (
        db.session.execute(
            select(Reserva).where(Reserva.grupo_id == reservas[0].grupo_id)
        )
        .scalars()
        .all()
    )
    assert len(activas) == len(reservas)
    assert (
        db.session.execute(
            select(Penalizacion).where(Penalizacion.user_id == user.id)
        )
        .scalars()
        .all()
        == []
    )


def test_checkout_con_suscripcion_activa_da_400(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno, make_pago
):
    """Con un abono vigente en el turno, el checkout duplicado devuelve 400.

    No 409: ese código lo reserva el frontend para ofrecer la lista de espera,
    y acá no hay nada que esperar (el lugar ya es del cliente).
    """
    from app.models.pago import PagoEstado

    user = make_user()
    turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=10)
    with freeze_time("2026-08-01"):
        reservas = pr.reserva_service.crear_reserva_mensual(
            user.id, turno.id, date(2026, 8, 3)
        )
    make_pago(user, reservas[0], "1000.00", PagoEstado.PAGADO)

    monkeypatch.setattr(pr, "current_user_id", lambda: user.id)
    with freeze_time("2026-08-02"), app.test_request_context(
        json={"turno_id": turno.id, "fecha": "2026-09-07", "tipo": "eventual"}
    ):
        resp, status = pr.checkout()

    assert status == 400
    assert (
        resp.get_json()["error"]
        == "Ya posees una suscripción activa para este turno"
    )
