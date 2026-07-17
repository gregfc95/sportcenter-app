"""Tests de POST /api/notificaciones/generar-renovaciones (demo de admin).

La ruta valida mes actual/siguiente contra el calendario real, así que cada
request se hace bajo freeze_time; el abono de origen se crea en julio 2026 como
en los tests del servicio.
"""

from datetime import date

from freezegun import freeze_time
from sqlalchemy import select

from app import db
from app.models.reserva import Reserva
from app.models.turno import DiaSemana
from app.models.user import UserRole
from app.services.pago_service import PagoService
from app.services.reserva_service import ReservaService

PATH = "/api/notificaciones/generar-renovaciones"

reserva_svc = ReservaService()
pago_svc = PagoService()


def _abono_pago_julio(make_user, make_actividad, make_turno):
    """Abono mensual de julio 2026 pagado: candidato a renovación en agosto."""
    user = make_user()
    turno = make_turno(make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES)
    with freeze_time("2026-07-01"):
        reservas = reserva_svc.crear_reserva_mensual(user.id, turno.id, date(2026, 7, 6))
        pago_svc.registrar_mensualidad(reservas[0].id)
    return user, turno, reservas[0].grupo_id


def _renovaciones_de(grupo_origen):
    stmt = select(Reserva).where(Reserva.renovacion_de_grupo_id == grupo_origen)
    return db.session.execute(stmt).scalars().all()


def test_cliente_y_empleado_no_pueden_generar(app, db_session, make_user):
    cliente = make_user()
    empleado = make_user(role=UserRole.EMPLOYEE)

    for user in (cliente, empleado):
        resp = app.test_client().post(
            PATH, headers={"X-User-ID": str(user.id)}, json={"mes": 8}
        )
        assert resp.status_code == 403


def test_happy_path_genera_el_mes_elegido(
    app, db_session, make_user, make_actividad, make_turno
):
    admin = make_user(role=UserRole.ADMIN)
    _, _, grupo_origen = _abono_pago_julio(make_user, make_actividad, make_turno)

    with freeze_time("2026-08-05"):
        resp = app.test_client().post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": 8}
        )

    creadas = _renovaciones_de(grupo_origen)
    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "creadas": len(creadas)}
    assert creadas
    assert all(r.fecha.month == 8 for r in creadas)


def test_genera_mes_siguiente_aunque_hoy_pase_el_11(
    app, db_session, make_user, make_actividad, make_turno
):
    # El guard del día 11 aplica al `hoy` del job; el botón manda el día 1 del
    # mes elegido, así que sirve para preparar el mes que viene por adelantado.
    admin = make_user(role=UserRole.ADMIN)
    _, _, grupo_origen = _abono_pago_julio(make_user, make_actividad, make_turno)

    with freeze_time("2026-07-20"):
        resp = app.test_client().post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": 8}
        )

    assert resp.status_code == 200
    assert resp.get_json()["creadas"] == len(_renovaciones_de(grupo_origen)) > 0


def test_es_idempotente(app, db_session, make_user, make_actividad, make_turno):
    admin = make_user(role=UserRole.ADMIN)
    _abono_pago_julio(make_user, make_actividad, make_turno)

    with freeze_time("2026-08-05"):
        cliente_http = app.test_client()
        primera = cliente_http.post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": 8}
        )
        segunda = cliente_http.post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": 8}
        )

    assert primera.get_json()["creadas"] > 0
    assert segunda.get_json() == {"ok": True, "creadas": 0}


def test_no_pisa_una_reserva_existente_del_cliente(
    app, db_session, make_user, make_actividad, make_turno, make_reserva
):
    admin = make_user(role=UserRole.ADMIN)
    user, turno, grupo_origen = _abono_pago_julio(make_user, make_actividad, make_turno)
    # El cliente ya tiene una fila activa en una fecha de agosto (insertada
    # directo: el servicio se lo impediría por la suscripción vigente): la
    # generación choca con el índice único y hace rollback sin duplicar.
    existente = make_reserva(user, turno, date(2026, 8, 3))

    with freeze_time("2026-08-05"):
        resp = app.test_client().post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": 8}
        )

    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "creadas": 0}
    assert _renovaciones_de(grupo_origen) == []
    assert existente.deleted_at is None


def test_mes_invalido_devuelve_400(app, db_session, make_user):
    admin = make_user(role=UserRole.ADMIN)

    with freeze_time("2026-08-05"):
        cliente_http = app.test_client()
        fuera_de_rango = cliente_http.post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": 10}
        )
        no_entero = cliente_http.post(
            PATH, headers={"X-User-ID": str(admin.id)}, json={"mes": "8"}
        )

    assert fuera_de_rango.status_code == 400
    assert no_entero.status_code == 400
