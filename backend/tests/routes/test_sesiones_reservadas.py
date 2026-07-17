"""Tests de los endpoints de sesiones reservadas (vista admin/empleado).

Cubren el invariante que la vista debe poder explicar:
`ocupados == reservas listadas + ofertados de la lista de espera + holds`.
Las vistas exigen rol de staff vía `require_role`, que se anula con
monkeypatch (mismo enfoque que `test_lista_espera_routes`). El envío de email
se anula.
"""

from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from freezegun import freeze_time

from app.models.pago import PagoEstado
from app.models.reserva import ReservaTipo
from app.models.turno import DiaSemana
from app.services.lista_espera_service import ListaEsperaService
from app.services.reserva_service import ReservaService
import app.routes.reserva_routes as rr

reserva_svc = ReservaService()
lista_svc = ListaEsperaService()


@pytest.fixture(autouse=True)
def _staff(monkeypatch):
    monkeypatch.setattr(rr, "require_role", lambda *roles: None)
    monkeypatch.setattr(
        "app.services.lista_espera_service.send_lista_espera_email",
        lambda *a, **k: None,
    )


@pytest.fixture
def lleno(make_user, make_actividad, make_turno, make_reserva, next_date_for):
    """Turno de cupo 1 lleno por un ocupante, en la próxima fecha del turno."""
    dueno = make_user(first_name="Dueno", last_name="Ocupante")
    turno = make_turno(
        make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES, cupo=1
    )
    fecha = next_date_for(DiaSemana.LUNES)
    ocupante = make_reserva(dueno, turno, fecha)
    return SimpleNamespace(turno=turno, fecha=fecha, ocupante=ocupante)


def _detalle(app, turno_id, fecha):
    with app.test_request_context():
        resp, status = rr.get_sesion_reservada(turno_id, fecha.isoformat())
    assert status == 200
    return resp.get_json()


def _liberar(lleno):
    reserva_svc.cancelar_reserva(lleno.ocupante.id)
    lista_svc.promover(lleno.turno.id, lleno.fecha, motivo="cancelacion")


class TestDetalleListaEspera:
    def test_espera_ordenada_con_posiciones(self, app, db_session, lleno, make_user):
        eventual, mensual = make_user(), make_user()
        reserva_svc.unirse_lista_espera(eventual.id, lleno.turno.id, lleno.fecha)
        reserva_svc.unirse_lista_espera(
            mensual.id, lleno.turno.id, lleno.fecha, ReservaTipo.MENSUAL
        )

        body = _detalle(app, lleno.turno.id, lleno.fecha)

        espera = body["lista_espera"]
        assert [e["cliente"]["id"] for e in espera] == [mensual.id, eventual.id]
        assert [e["posicion"] for e in espera] == [1, 2]
        assert all(e["estado_espera"] == "esperando" for e in espera)
        assert all(e["ocupa_cupo"] is False for e in espera)
        assert espera[0]["cliente"]["email"] == mensual.email

    def test_ofertado_retiene_cupo_y_cierra_el_invariante(
        self, app, db_session, lleno, make_user
    ):
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)
        _liberar(lleno)

        body = _detalle(app, lleno.turno.id, lleno.fecha)

        assert body["reservas"] == []
        entrada = body["lista_espera"][0]
        assert entrada["estado_espera"] == "ofertado"
        assert entrada["ocupa_cupo"] is True
        assert entrada["oferta_expira_at"] is not None
        assert entrada["posicion"] is None
        ofertados = sum(1 for e in body["lista_espera"] if e["ocupa_cupo"])
        assert body["turno"]["ocupados"] == len(body["reservas"]) + ofertados + len(
            body["holds"]
        )
        assert body["turno"]["ocupados"] == 1

    def test_vencido_visible_sin_ocupar_cupo(self, app, db_session, lleno, make_user):
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)
        _liberar(lleno)

        with freeze_time(datetime.now(timezone.utc) + timedelta(hours=2)):
            lista_svc.expirar_ofertas()

        body = _detalle(app, lleno.turno.id, lleno.fecha)

        entrada = body["lista_espera"][0]
        assert entrada["estado_espera"] == "vencido"
        assert entrada["ocupa_cupo"] is False
        assert body["turno"]["ocupados"] == 0

    def test_holds_visibles_en_mes_futuro(
        self, app, db_session, make_user, make_actividad, make_turno, make_pago
    ):
        abonado = make_user(first_name="Abo", last_name="Nado")
        turno = make_turno(
            make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES, cupo=1
        )
        with freeze_time("2026-07-01"):
            reservas = reserva_svc.crear_reserva_mensual(
                abonado.id, turno.id, date(2026, 7, 6)
            )
        make_pago(abonado, reservas[0], "1000.00", PagoEstado.PAGADO)

        body = _detalle(app, turno.id, date(2026, 8, 3))

        assert body["reservas"] == []
        assert [h["cliente"]["id"] for h in body["holds"]] == [abonado.id]
        assert body["turno"]["ocupados"] == len(body["holds"]) == 1

    def test_invariante_con_firme_ofertado_y_hold(
        self, app, db_session, make_user, make_actividad, make_turno, make_pago
    ):
        abonado, firme, saliente, waiter = (
            make_user(),
            make_user(),
            make_user(),
            make_user(),
        )
        turno = make_turno(
            make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES, cupo=3
        )
        with freeze_time("2026-07-01"):
            reservas = reserva_svc.crear_reserva_mensual(
                abonado.id, turno.id, date(2026, 7, 6)
            )
        make_pago(abonado, reservas[0], "1000.00", PagoEstado.PAGADO)

        fecha_futura = date(2026, 8, 3)
        with freeze_time("2026-07-02"):
            reserva_svc.crear_reserva(firme.id, turno.id, fecha_futura)
            saliente_reserva = reserva_svc.crear_reserva(
                saliente.id, turno.id, fecha_futura
            )
            reserva_svc.unirse_lista_espera(waiter.id, turno.id, fecha_futura)
            reserva_svc.cancelar_reserva(saliente_reserva.id)
            lista_svc.promover(turno.id, fecha_futura, motivo="cancelacion")

            body = _detalle(app, turno.id, fecha_futura)

        assert [r["cliente"]["id"] for r in body["reservas"]] == [firme.id]
        ofertados = sum(1 for e in body["lista_espera"] if e["ocupa_cupo"])
        assert ofertados == 1
        assert len(body["holds"]) == 1
        assert body["turno"]["ocupados"] == 3


class TestListadoSesiones:
    def test_incluye_sesion_cuya_unica_ocupacion_es_una_oferta(
        self, app, db_session, lleno, make_user
    ):
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)
        _liberar(lleno)

        with app.test_request_context():
            resp, status = rr.list_sesiones_reservadas()
        assert status == 200
        sesiones = [
            s
            for s in resp.get_json()
            if s["turno_id"] == lleno.turno.id and s["fecha"] == lleno.fecha.isoformat()
        ]
        assert len(sesiones) == 1
        assert sesiones[0]["reservas"] == 0
        assert sesiones[0]["ocupados"] == 1

    def test_en_espera_cuenta_todas_las_filas_de_espera(
        self, app, db_session, lleno, make_user
    ):
        # Un ofertado, un esperando y un vencido: la card muestra 3, la gente
        # anotada, sin importar el subestado. Otra sesión sin espera trae 0.
        primero, segundo, tercero = make_user(), make_user(), make_user()
        for waiter in (primero, segundo, tercero):
            reserva_svc.unirse_lista_espera(waiter.id, lleno.turno.id, lleno.fecha)
        _liberar(lleno)
        with freeze_time(datetime.now(timezone.utc) + timedelta(hours=2)):
            lista_svc.expirar_ofertas()

        with app.test_request_context():
            resp, status = rr.list_sesiones_reservadas()
        assert status == 200
        sesion = [
            s
            for s in resp.get_json()
            if s["turno_id"] == lleno.turno.id and s["fecha"] == lleno.fecha.isoformat()
        ][0]
        assert sesion["en_espera"] == 3

    def test_en_espera_cero_sin_lista(self, app, db_session, lleno):
        with app.test_request_context():
            resp, _ = rr.list_sesiones_reservadas()
        sesion = [
            s for s in resp.get_json() if s["turno_id"] == lleno.turno.id
        ][0]
        assert sesion["en_espera"] == 0
