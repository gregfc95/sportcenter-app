"""Tests de la ruta GET /api/mensualidad/estado.

La vista lee `current_user_id()` sin decorador de auth, así que se la llama
dentro de `test_request_context` monkeypatcheando ese helper.
"""

import app.routes.mensualidad_routes as mr


def test_estado_usuario_limpio(app, db_session, monkeypatch, make_user):
    user = make_user()
    monkeypatch.setattr(mr, "current_user_id", lambda: user.id)
    with app.test_request_context():
        body = mr.estado_mensual()[0].get_json()
    assert body == {
        "suspendido": False,
        "penalizaciones_mes": 0,
        "penalizaciones_max": 3,
        "tiene_descuento": True,
        "descuento_pct": 20,
    }


def test_estado_usuario_suspendido(app, db_session, monkeypatch, make_user):
    user = make_user()
    mr.mensualidad_service.suspender_usuario(user.id, "g1")
    monkeypatch.setattr(mr, "current_user_id", lambda: user.id)
    with app.test_request_context():
        body = mr.estado_mensual()[0].get_json()
    assert body["suspendido"] is True
    assert body["tiene_descuento"] is False
