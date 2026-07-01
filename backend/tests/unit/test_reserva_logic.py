"""Unit tests de la lógica de reserva sin DB.

`es_reembolsable` (ventana de 24 h, anclada a hora de Argentina) se prueba con
`freezegun` para fijar el "ahora" y atacar el límite exacto. `_validar_dia_semana`
se prueba con objetos transitorios.
"""

from datetime import date, time

import pytest
from freezegun import freeze_time

from app.models.reserva import Reserva
from app.models.turno import DiaSemana, Turno
from app.services.reserva_service import WEEKDAY_TO_DIA_SEMANA, ReservaService

svc = ReservaService()


def _reserva(hora, fecha=date(2026, 6, 16)):
    turno = Turno(dia_semana=DiaSemana.MARTES, hora=hora, cupo=10)
    reserva = Reserva(user_id=1, turno_id=1, fecha=fecha)
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
