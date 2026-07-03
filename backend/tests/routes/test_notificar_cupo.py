"""Tests de POST /api/notificaciones/cupo-disponible (disparo manual de demo).

Se ejercita vía `test_client` con el header `X-User-ID` (el stub de auth real)
y el mailer monkeypatcheado: acá importa el guard de rol y el armado de los
labels, no el transporte.
"""

from datetime import time

from app.models.turno import DiaSemana
from app.models.user import UserRole


PATH = "/api/notificaciones/cupo-disponible"


def test_client_no_puede_disparar_el_aviso(
    app, db_session, make_user, make_actividad, make_turno
):
    cliente = make_user()
    turno = make_turno(make_actividad())

    resp = app.test_client().post(
        PATH,
        json={"cliente_id": cliente.id, "turno_id": turno.id},
        headers={"X-User-ID": str(cliente.id)},
    )

    assert resp.status_code == 403


def test_happy_path_envia_el_email_con_los_datos_del_turno(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno
):
    admin = make_user(role=UserRole.ADMIN)
    cliente = make_user(first_name="Ana")
    turno = make_turno(
        make_actividad(nombre="Padel"), dia_semana=DiaSemana.LUNES, hora=time(10, 0)
    )

    enviados = []
    monkeypatch.setattr(
        "app.services.notificacion_service.send_lista_espera_email",
        lambda email, **kw: enviados.append((email, kw)),
    )

    resp = app.test_client().post(
        PATH,
        json={"cliente_id": cliente.id, "turno_id": turno.id},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 200
    assert resp.get_json() == {"ok": True, "email": cliente.email}
    [(email, kw)] = enviados
    assert email == cliente.email
    assert kw["nombre"] == "Ana"
    assert kw["actividad"] == "Padel"
    assert kw["turno_label"] == "lunes 10:00"


def test_mailer_sin_configurar_devuelve_503(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno
):
    admin = make_user(role=UserRole.ADMIN)
    cliente = make_user()
    turno = make_turno(make_actividad())

    def _sin_config(*args, **kwargs):
        raise RuntimeError("Mailtrap no está configurado")

    monkeypatch.setattr(
        "app.services.notificacion_service.send_lista_espera_email", _sin_config
    )

    resp = app.test_client().post(
        PATH,
        json={"cliente_id": cliente.id, "turno_id": turno.id},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 503
    assert "no está configurado" in resp.get_json()["error"]


def test_turno_inexistente_devuelve_404(app, db_session, make_user):
    admin = make_user(role=UserRole.ADMIN)
    cliente = make_user()

    resp = app.test_client().post(
        PATH,
        json={"cliente_id": cliente.id, "turno_id": 99999},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 404


def test_cliente_id_invalido_devuelve_400(app, db_session, make_user):
    admin = make_user(role=UserRole.ADMIN)

    resp = app.test_client().post(
        PATH,
        json={"cliente_id": "uno", "turno_id": 1},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 400
