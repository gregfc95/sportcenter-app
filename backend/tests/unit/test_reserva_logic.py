"""Unit tests de la lógica de reserva sin DB.

`es_reembolsable` (ventana de 24 h, anclada a hora de Argentina) se prueba con
`freezegun` para fijar el "ahora" y atacar el límite exacto. `_validar_dia_semana`
se prueba con objetos transitorios.
"""

from datetime import date, time

import pytest
from freezegun import freeze_time

from app.models.reserva import Reserva, ReservaTipo
from app.models.turno import DiaSemana, Turno
from app.services.reserva_service import (
    WEEKDAY_TO_DIA_SEMANA,
    ReservaService,
    fechas_mensuales,
)

svc = ReservaService()


def _reserva(hora, fecha=date(2026, 6, 16), tipo=ReservaTipo.EVENTUAL):
    turno = Turno(dia_semana=DiaSemana.MARTES, hora=hora, cupo=10)
    reserva = Reserva(user_id=1, turno_id=1, fecha=fecha, tipo=tipo)
    reserva.turno = turno
    return reserva


# "Ahora" congelado en 2026-06-15 12:00 UTC = 09:00 en Argentina (UTC-3).
@freeze_time("2026-06-15 12:00:00")
class TestEsReembolsable:
    def test_mas_de_24h_es_reembolsable(self):
        # inicio 2026-06-16 10:00 AR -> 25 h de anticipación.
        assert svc.es_reembolsable(_reserva(time(10, 0))) is True

    def test_menos_de_24h_no_es_reembolsable(self):
        # inicio 2026-06-16 08:00 AR -> 23 h.
        assert svc.es_reembolsable(_reserva(time(8, 0))) is False

    def test_24h_y_un_minuto_es_reembolsable(self):
        # inicio 2026-06-16 09:01 AR -> 24 h 1 min.
        assert svc.es_reembolsable(_reserva(time(9, 1))) is True

    def test_un_minuto_antes_de_24h_no_es_reembolsable(self):
        # inicio 2026-06-16 08:59 AR -> 23 h 59 min.
        assert svc.es_reembolsable(_reserva(time(8, 59))) is False

    def test_exactamente_24h_no_es_reembolsable(self):
        # El corte es estricto (> 24 h): justo 24 h no reembolsa.
        assert svc.es_reembolsable(_reserva(time(9, 0))) is False


# Las clases mensuales usan una ventana de 48 h (reembolso o crédito, a
# elección del cliente). Mismo "ahora" congelado: 2026-06-15 09:00 AR.
@freeze_time("2026-06-15 12:00:00")
class TestEsReembolsableMensual:
    def test_mas_de_48h_tiene_beneficio(self):
        # inicio 2026-06-17 10:00 AR -> 49 h de anticipación.
        reserva = _reserva(time(10, 0), fecha=date(2026, 6, 17), tipo=ReservaTipo.MENSUAL)
        assert svc.es_reembolsable(reserva) is True

    def test_menos_de_48h_no_tiene_beneficio(self):
        # inicio 2026-06-17 08:00 AR -> 47 h.
        reserva = _reserva(time(8, 0), fecha=date(2026, 6, 17), tipo=ReservaTipo.MENSUAL)
        assert svc.es_reembolsable(reserva) is False

    def test_exactamente_48h_no_tiene_beneficio(self):
        # El corte es estricto (> 48 h).
        reserva = _reserva(time(9, 0), fecha=date(2026, 6, 17), tipo=ReservaTipo.MENSUAL)
        assert svc.es_reembolsable(reserva) is False

    def test_una_eventual_a_47h_sigue_siendo_reembolsable(self):
        # La ventana de 48 h es sólo para mensuales; la eventual usa 24 h.
        reserva = _reserva(time(8, 0), fecha=date(2026, 6, 17))
        assert svc.es_reembolsable(reserva) is True


class TestFechasMensuales:
    def test_mes_de_cinco_clases(self):
        # Julio 2026 tiene 5 miércoles: 1, 8, 15, 22 y 29.
        assert fechas_mensuales(date(2026, 7, 1)) == [
            date(2026, 7, 1),
            date(2026, 7, 8),
            date(2026, 7, 15),
            date(2026, 7, 22),
            date(2026, 7, 29),
        ]

    def test_inscripcion_a_mitad_de_mes(self):
        # Desde el 15/07 quedan 3 miércoles: 15, 22 y 29.
        assert fechas_mensuales(date(2026, 7, 15)) == [
            date(2026, 7, 15),
            date(2026, 7, 22),
            date(2026, 7, 29),
        ]

    def test_ultima_ocurrencia_es_una_sola_clase(self):
        assert fechas_mensuales(date(2026, 7, 29)) == [date(2026, 7, 29)]

    def test_nunca_mas_de_cinco(self):
        for dia in range(1, 32):
            assert 1 <= len(fechas_mensuales(date(2026, 7, dia))) <= 5


class TestValidarDiaSemana:
    def test_fecha_que_coincide_no_lanza(self):
        fecha = date(2026, 6, 15)
        esperado = WEEKDAY_TO_DIA_SEMANA[fecha.weekday()]
        turno = Turno(dia_semana=esperado, hora=time(10, 0), cupo=10)
        svc._validar_dia_semana(turno, fecha)  # no lanza

    def test_fecha_que_no_coincide_lanza(self):
        fecha = date(2026, 6, 15)
        esperado = WEEKDAY_TO_DIA_SEMANA[fecha.weekday()]
        otro = next(d for d in DiaSemana if d != esperado)
        turno = Turno(dia_semana=otro, hora=time(10, 0), cupo=10)
        with pytest.raises(ValueError):
            svc._validar_dia_semana(turno, fecha)
