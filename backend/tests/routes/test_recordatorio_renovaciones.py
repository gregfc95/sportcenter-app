"""Tests de POST /api/notificaciones/recordatorio-renovaciones (demo de staff).

El endpoint dispara `recordar_renovaciones_impagas` sin `hoy`, o sea sobre el
mes calendario real: la renovación impaga se arma con fecha en el mes en curso.
Mailer monkeypatcheado; acá importa el guard de rol y el conteo devuelto.
"""

from datetime import date
from uuid import uuid4

from app import db
from app.models.reserva import ReservaTipo
from app.models.user import UserRole


PATH = "/api/notificaciones/recordatorio-renovaciones"


def _crear_renovacion_impaga(make_user, make_actividad, make_turno, make_reserva):
    """Renovación del mes en curso sin cobros (una clase alcanza)."""
    user = make_user()
    turno = make_turno(make_actividad())
    reserva = make_reserva(
        user, turno, date.today().replace(day=28), tipo=ReservaTipo.MENSUAL
    )
    reserva.grupo_id = uuid4().hex
    reserva.renovacion_de_grupo_id = uuid4().hex
    db.session.commit()
    return user


def test_client_no_puede_disparar_el_recordatorio(app, db_session, make_user):
    cliente = make_user()

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(cliente.id)})

    assert resp.status_code == 403


def test_happy_path_informa_los_enviados(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno, make_reserva
):
    admin = make_user(role=UserRole.ADMIN)
    deudor = _crear_renovacion_impaga(
        make_user, make_actividad, make_turno, make_reserva
    )

    enviados = []
    monkeypatch.setattr(
        "app.services.mensualidad_service.send_recordatorio_renovacion_email",
        lambda email, **kw: enviados.append(email),
    )

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(admin.id)})

    assert resp.status_code == 200
    assert resp.get_json() == {
        "ok": True,
        "enviados": 1,
        "emails": [deudor.email],
    }
    assert enviados == [deudor.email]


def test_sin_renovaciones_impagas_devuelve_cero(
    app, db_session, monkeypatch, make_user
):
    admin = make_user(role=UserRole.ADMIN)
    monkeypatch.setattr(
        "app.services.mensualidad_service.send_recordatorio_renovacion_email",
        lambda email, **kw: None,
    )

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(admin.id)})

    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "enviados": 0, "emails": []}
