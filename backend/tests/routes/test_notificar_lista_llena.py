"""Tests de POST /api/notificaciones/lista-espera-llena (disparo manual de demo).

Se ejercita vía `test_client` con el header `X-User-ID` (el stub de auth real)
y el sender de admin monkeypatcheado: acá importa el guard de rol y el armado de
los labels/destinatarios, no el transporte.
"""

from datetime import time

from app.models.turno import DiaSemana
from app.models.user import UserRole


PATH = "/api/notificaciones/lista-espera-llena"


def test_client_no_puede_disparar_el_aviso(
    app, db_session, make_user, make_actividad, make_turno
):
    cliente = make_user()
    turno = make_turno(make_actividad())

    resp = app.test_client().post(
        PATH,
        json={"turno_id": turno.id},
        headers={"X-User-ID": str(cliente.id)},
    )

    assert resp.status_code == 403


def test_happy_path_avisa_a_los_admins_con_los_datos_del_turno(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno
):
    admin = make_user(role=UserRole.ADMIN)
    otro_admin = make_user(role=UserRole.ADMIN)
    turno = make_turno(
        make_actividad(nombre="Padel"), dia_semana=DiaSemana.LUNES, hora=time(10, 0)
    )

    enviados = []
    monkeypatch.setattr(
        "app.services.lista_espera_service.send_lista_espera_admin_email",
        lambda email, **kw: enviados.append((email, kw)),
    )

    resp = app.test_client().post(
        PATH,
        json={"turno_id": turno.id},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["ok"] is True
    assert body["enviados"] == 2
    assert set(body["emails"]) == {admin.email, otro_admin.email}
    assert all(kw["actividad"] == "Padel" for _, kw in enviados)
    assert all(kw["turno_label"] == "lunes 10:00" for _, kw in enviados)


def test_turno_inexistente_devuelve_404(app, db_session, make_user):
    admin = make_user(role=UserRole.ADMIN)

    resp = app.test_client().post(
        PATH,
        json={"turno_id": 99999},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 404


def test_turno_id_invalido_devuelve_400(app, db_session, make_user):
    admin = make_user(role=UserRole.ADMIN)

    resp = app.test_client().post(
        PATH,
        json={"turno_id": "uno"},
        headers={"X-User-ID": str(admin.id)},
    )

    assert resp.status_code == 400
