"""Unit tests de los helpers puros de `TurnoService` (en memoria, sin DB).

Cubre la detección de superposición de horarios (ventana de 60 min) y el piso
de reservas vigentes para bajar el cupo. El conteo de cupo/lugares dejó de ser
puro (consulta la DB para sumar los holds virtuales de los abonados) y se
prueba en `tests/services/test_turno_service.py`.
"""

from datetime import date, time, timedelta

from app.models.reserva import Reserva, ReservaTipo
from app.models.turno import DiaSemana, Turno
from app.services.turno_service import TurnoService

svc = TurnoService()


def _turno(hora=time(16, 0), cupo=10, reservas=None):
    t = Turno(dia_semana=DiaSemana.LUNES, hora=hora, cupo=cupo)
    if reservas is not None:
        t.reservas = reservas
    return t


def _reserva(fecha, tipo=ReservaTipo.EVENTUAL):
    return Reserva(user_id=1, turno_id=1, fecha=fecha, tipo=tipo)


class TestTurnoSuperpuesto:
    def test_dentro_de_la_ventana_choca(self):
        existentes = [_turno(time(16, 0))]
        assert svc._turno_superpuesto(existentes, time(16, 30)) is not None

    def test_exactamente_60_min_no_choca(self):
        # 16:00 vs 17:00 = 60 min; el corte es estricto (< 60).
        existentes = [_turno(time(16, 0))]
        assert svc._turno_superpuesto(existentes, time(17, 0)) is None
        assert svc._turno_superpuesto(existentes, time(15, 0)) is None

    def test_59_min_choca_en_ambos_sentidos(self):
        existentes = [_turno(time(16, 0))]
        assert svc._turno_superpuesto(existentes, time(16, 59)) is not None
        assert svc._turno_superpuesto(existentes, time(15, 1)) is not None

    def test_lista_vacia_no_choca(self):
        assert svc._turno_superpuesto([], time(16, 0)) is None

    def test_devuelve_el_turno_en_conflicto(self):
        conflictivo = _turno(time(16, 15))
        existentes = [_turno(time(9, 0)), conflictivo]
        assert svc._turno_superpuesto(existentes, time(16, 0)) is conflictivo


class TestMaxReservasVigentes:
    def test_toma_la_sesion_futura_mas_reservada(self):
        futura_1 = date.today() + timedelta(days=7)
        futura_2 = date.today() + timedelta(days=14)
        pasada = date.today() - timedelta(days=7)
        turno = _turno(
            reservas=[
                _reserva(futura_1),
                _reserva(futura_1),
                _reserva(futura_1),
                _reserva(futura_2),
                _reserva(pasada),                          # pasada: ignorada
                _reserva(pasada),
                _reserva(futura_1, tipo=ReservaTipo.MENSUAL),  # también cuenta
            ],
        )
        assert svc._max_reservas_vigentes(turno) == 4

    def test_sin_reservas_futuras_es_cero(self):
        pasada = date.today() - timedelta(days=7)
        turno = _turno(reservas=[_reserva(pasada)])
        assert svc._max_reservas_vigentes(turno) == 0
