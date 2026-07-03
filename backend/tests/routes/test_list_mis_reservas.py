"""Tests de la ruta GET /api/reservas (`list_mis_reservas`).

La vista no tiene decorador de auth: lee `current_user_id()` de `app.auth`, así
que se la maneja directamente dentro de un `test_request_context` monkeypatcheando
ese helper (mismo enfoque usado para verificar a mano).
"""

from datetime import date, timedelta
from uuid import uuid4

from app import db
from app.models.reserva import ReservaTipo
from app.models.turno import DiaSemana
import app.routes.reserva_routes as rr


def _primer_lunes_del_proximo_mes() -> date:
    """Primer lunes del mes que viene (siempre futuro, con >=2 lunes por delante)."""
    hoy = date.today()
    primero_prox = (hoy.replace(day=1) + timedelta(days=32)).replace(day=1)
    d = primero_prox
    while d.weekday() != 0:  # 0 = lunes
        d += timedelta(days=1)
    return d


def test_dos_abonos_mismo_turno_y_mes_salen_como_cards_separadas(
    app, db_session, monkeypatch, make_user, make_actividad, make_turno, make_reserva
):
    # Dos abonos vivos del mismo (turno, mes) con grupo_id distinto —el caso que
    # con la clave (turno, año, mes) colapsaba a una sola card y perdía el 2do.
    user = make_user()
    turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
    lunes1 = _primer_lunes_del_proximo_mes()
    lunes2 = lunes1 + timedelta(days=7)  # segundo lunes, mismo mes

    r1 = make_reserva(user, turno, lunes1, tipo=ReservaTipo.MENSUAL)
    r2 = make_reserva(user, turno, lunes2, tipo=ReservaTipo.MENSUAL)
    r1.grupo_id = uuid4().hex
    r2.grupo_id = uuid4().hex
    db.session.commit()

    monkeypatch.setattr(rr, "current_user_id", lambda: user.id)
    with app.test_request_context():
        payload = rr.list_mis_reservas()[0].get_json()

    mensuales = [c for c in payload if c["tipo"] == "mensual"]
    assert len(mensuales) == 2
    assert {c["id"] for c in mensuales} == {r1.id, r2.id}
