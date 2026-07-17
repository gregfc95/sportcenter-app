"""Tests de `services/cupo.py`: `holds_para` debe espejar lo que suma `ocupados`.

El detalle de una sesión lista estos holds para que el conteo de cupo cierre a
la vista; si divergieran del conteo, la UI volvería a mostrar números
inexplicables.
"""

from datetime import date

from freezegun import freeze_time

from app.models.pago import PagoEstado
from app.models.turno import DiaSemana
from app.services import cupo
from app.services.reserva_service import ReservaService

reserva_svc = ReservaService()


def _abonado_julio(make_user, make_actividad, make_turno, make_pago, cupo_turno=1):
    abonado = make_user()
    turno = make_turno(
        make_actividad(precio="1000.00"), dia_semana=DiaSemana.LUNES, cupo=cupo_turno
    )
    with freeze_time("2026-07-01"):
        reservas = reserva_svc.crear_reserva_mensual(
            abonado.id, turno.id, date(2026, 7, 6)
        )
    make_pago(abonado, reservas[0], "1000.00", PagoEstado.PAGADO)
    return abonado, turno


class TestHoldsPara:
    def test_hold_en_mes_futuro_coincide_con_ocupados(
        self, db_session, make_user, make_actividad, make_turno, make_pago
    ):
        abonado, turno = _abonado_julio(
            make_user, make_actividad, make_turno, make_pago
        )
        fecha_futura = date(2026, 8, 3)
        assert cupo.holds_para(turno, fecha_futura) == [abonado.id]
        assert cupo.ocupados(turno, fecha_futura) == 1

    def test_sin_hold_dentro_del_mes_del_tip(
        self, db_session, make_user, make_actividad, make_turno, make_pago
    ):
        # Dentro de su mes mandan las filas concretas del abono, no el hold.
        _, turno = _abonado_julio(make_user, make_actividad, make_turno, make_pago)
        assert cupo.holds_para(turno, date(2026, 7, 13)) == []

    def test_titular_con_fila_firme_no_duplica(
        self, db_session, make_user, make_actividad, make_turno, make_pago, make_reserva
    ):
        # La fila firme se inserta directo (la regla anti-duplicados del abono
        # impide crearla por el servicio): es el caso de datos previos a la regla.
        abonado, turno = _abonado_julio(
            make_user, make_actividad, make_turno, make_pago, cupo_turno=2
        )
        fecha_futura = date(2026, 8, 3)
        make_reserva(abonado, turno, fecha_futura)
        assert cupo.holds_para(turno, fecha_futura) == []
        assert cupo.ocupados(turno, fecha_futura) == 1
