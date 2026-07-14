"""Tests de POST /api/notificaciones/reset-penalizaciones (demo de staff).

El endpoint borra las penalizaciones del mes en curso (calendario real, sin
`hoy`), o sea que las penalizaciones a resetear se crean sin fechar y las que
deben sobrevivir se fechan en el mes anterior con freezegun.
"""

from datetime import date, datetime, timedelta, timezone

from freezegun import freeze_time

from app import db
from app.models.penalizacion import Penalizacion, PenalizacionMotivo
from app.models.user import UserRole
from app.services.mensualidad_service import MensualidadService


PATH = "/api/notificaciones/reset-penalizaciones"

mensual_svc = MensualidadService()


def _penalizar(user, reserva, cuando=None):
    """Crea una penalización; `cuando` (datetime) la fecha en otro mes."""
    if cuando is None:
        db.session.add(
            Penalizacion(
                user_id=user.id,
                reserva_id=reserva.id,
                motivo=PenalizacionMotivo.CANCELACION_CLASE,
            )
        )
        db.session.commit()
        return
    with freeze_time(cuando):
        db.session.add(
            Penalizacion(
                user_id=user.id,
                reserva_id=reserva.id,
                motivo=PenalizacionMotivo.CANCELACION_CLASE,
            )
        )
        db.session.commit()


def test_client_no_puede_resetear(app, db_session, make_user):
    cliente = make_user()

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(cliente.id)})

    assert resp.status_code == 403


def test_happy_path_borra_las_del_mes_y_deja_el_contador_en_cero(
    app, db_session, make_user, make_actividad, make_turno, make_reserva
):
    admin = make_user(role=UserRole.ADMIN)
    cliente = make_user()
    turno = make_turno(make_actividad())
    reserva = make_reserva(cliente, turno, date.today())
    _penalizar(cliente, reserva)

    hoy = date.today()
    assert mensual_svc._penalizaciones_mes(cliente.id, hoy.year, hoy.month) == 1

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(admin.id)})

    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "borradas": 1}
    assert mensual_svc._penalizaciones_mes(cliente.id, hoy.year, hoy.month) == 0


def test_no_borra_penalizaciones_de_meses_anteriores(
    app, db_session, make_user, make_actividad, make_turno, make_reserva
):
    admin = make_user(role=UserRole.ADMIN)
    cliente = make_user()
    turno = make_turno(make_actividad())
    reserva = make_reserva(cliente, turno, date.today())
    # Fechada a mediados del mes anterior: fuera de la ventana del reset.
    mes_anterior = datetime.now(timezone.utc).replace(day=15) - timedelta(days=32)
    _penalizar(cliente, reserva, cuando=mes_anterior)

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(admin.id)})

    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "borradas": 0}


def test_sin_penalizaciones_devuelve_cero(app, db_session, make_user):
    admin = make_user(role=UserRole.ADMIN)

    resp = app.test_client().post(PATH, headers={"X-User-ID": str(admin.id)})

    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "borradas": 0}
