"""Tests de las rutas de lista de espera.

Las vistas leen `current_user_id()` sin decorador de auth, así que se las llama
dentro de `test_request_context` monkeypatcheando ese helper (mismo enfoque que
`test_list_mis_reservas`). El envío de email se anula.
"""

from datetime import date, timedelta

import pytest

import app.routes.pago_routes as pr
import app.routes.reserva_routes as rr
from app.models.reserva import EstadoEspera
from app.models.turno import DiaSemana


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    monkeypatch.setattr(
        "app.services.lista_espera_service.send_lista_espera_email",
        lambda *a, **k: None,
    )


def _proximo_lunes() -> date:
    d = date.today() + timedelta(days=7)
    while d.weekday() != 0:
        d += timedelta(days=1)
    return d


@pytest.fixture
def turno_lleno(make_user, make_actividad, make_turno, make_reserva):
    dueno = make_user()
    turno = make_turno(make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES, cupo=1)
    fecha = _proximo_lunes()
    ocupante = make_reserva(dueno, turno, fecha)
    return turno, fecha, ocupante


def test_unirse_lista_espera_201(app, db_session, monkeypatch, turno_lleno, make_user):
    turno, fecha, _ = turno_lleno
    waiter = make_user()
    monkeypatch.setattr(rr, "current_user_id", lambda: waiter.id)
    with app.test_request_context(
        json={"turno_id": turno.id, "fecha": fecha.isoformat(), "tipo": "eventual"}
    ):
        resp, status = rr.unirse_lista_espera()
    assert status == 201
    body = resp.get_json()
    assert body["estado"] == "en_espera"
    assert body["reserva_id"] is not None


def test_unirse_con_lugar_400(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno
):
    turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=5)
    fecha = _proximo_lunes()
    waiter = make_user()
    monkeypatch.setattr(rr, "current_user_id", lambda: waiter.id)
    with app.test_request_context(
        json={"turno_id": turno.id, "fecha": fecha.isoformat(), "tipo": "eventual"}
    ):
        resp, status = rr.unirse_lista_espera()
    assert status == 400


def test_list_mis_reservas_expone_en_espera(
    app, db_session, monkeypatch, turno_lleno, make_user
):
    turno, fecha, _ = turno_lleno
    waiter = make_user()
    monkeypatch.setattr(rr, "current_user_id", lambda: waiter.id)
    with app.test_request_context(
        json={"turno_id": turno.id, "fecha": fecha.isoformat(), "tipo": "eventual"}
    ):
        rr.unirse_lista_espera()

    with app.test_request_context():
        payload = rr.list_mis_reservas()[0].get_json()

    assert len(payload) == 1
    card = payload[0]
    assert card["estado"] == "en_espera"
    assert card["espera"]["estado"] == "esperando"
    assert card["espera"]["posicion"] == 1


def test_checkout_turno_lleno_devuelve_409(
    app, db_session, monkeypatch, turno_lleno, make_user
):
    turno, fecha, _ = turno_lleno
    otro = make_user()
    monkeypatch.setattr(pr, "current_user_id", lambda: otro.id)
    with app.test_request_context(
        json={"turno_id": turno.id, "fecha": fecha.isoformat(), "tipo": "eventual"}
    ):
        resp, status = pr.checkout()
    assert status == 409


def test_cancelar_reserva_normal_promueve_al_frente(
    app, db_session, monkeypatch, turno_lleno, make_user
):
    turno, fecha, ocupante = turno_lleno
    waiter = make_user()
    monkeypatch.setattr(rr, "current_user_id", lambda: waiter.id)
    with app.test_request_context(
        json={"turno_id": turno.id, "fecha": fecha.isoformat(), "tipo": "eventual"}
    ):
        rr.unirse_lista_espera()

    # El dueño de la reserva que ocupa el cupo la cancela.
    monkeypatch.setattr(rr, "current_user_id", lambda: ocupante.user_id)
    with app.test_request_context(json={}):
        resp, status = rr.cancelar_mi_reserva(ocupante.id)
    assert status == 200

    fila = [r for r in turno.reservas if r.user_id == waiter.id][0]
    assert fila.estado_espera == EstadoEspera.OFERTADO
