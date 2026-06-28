"""Tests de `TurnoService` contra la base de datos de tests."""

from datetime import date, time, timedelta

import pytest

from app.models.turno import DiaSemana
from app.services.turno_service import TurnoService

svc = TurnoService()


def _data(actividad, dia=DiaSemana.LUNES, hora=time(16, 0), cupo=10):
    return {"actividad_id": actividad.id, "dia_semana": dia, "hora": hora, "cupo": cupo}


class TestCrearTurno:
    def test_crear_ok(self, make_actividad):
        actividad = make_actividad()
        turno = svc.crear_turno(_data(actividad))
        assert turno.id is not None
        assert turno.cupo == 10

    def test_conflicto_misma_actividad(self, make_actividad):
        actividad = make_actividad()
        svc.crear_turno(_data(actividad, hora=time(16, 0)))
        with pytest.raises(ValueError, match="Ya existe un turno"):
            svc.crear_turno(_data(actividad, hora=time(16, 30)))

    def test_distinta_actividad_no_choca(self, make_actividad):
        a1, a2 = make_actividad(), make_actividad()
        svc.crear_turno(_data(a1, hora=time(16, 0)))
        # Otra actividad en el mismo día y horario cercano: no choca.
        turno = svc.crear_turno(_data(a2, hora=time(16, 30)))
        assert turno.id is not None


class TestActualizar:
    def test_bajar_cupo_por_debajo_de_reservas_falla(
        self, make_actividad, make_turno, make_user, make_reserva
    ):
        turno = make_turno(make_actividad(), cupo=3)
        fecha = date.today() + timedelta(days=7)
        # Dos reservas en la misma sesión futura (distintos usuarios por el índice único).
        make_reserva(make_user(), turno, fecha)
        make_reserva(make_user(), turno, fecha)

        data = {"dia_semana": turno.dia_semana, "hora": turno.hora, "cupo": 1}
        with pytest.raises(ValueError, match="2 Reservas"):
            svc.actualizar(turno.id, data)

    def test_bajar_cupo_hasta_el_maximo_permitido(
        self, make_actividad, make_turno, make_user, make_reserva
    ):
        turno = make_turno(make_actividad(), cupo=3)
        fecha = date.today() + timedelta(days=7)
        make_reserva(make_user(), turno, fecha)
        make_reserva(make_user(), turno, fecha)

        data = {"dia_semana": turno.dia_semana, "hora": turno.hora, "cupo": 2}
        actualizado = svc.actualizar(turno.id, data)
        assert actualizado.cupo == 2

    def test_turno_inexistente_devuelve_none(self, make_actividad):
        data = {"dia_semana": DiaSemana.LUNES, "hora": time(10, 0), "cupo": 5}
        assert svc.actualizar(9999, data) is None


class TestEliminar:
    def test_con_reserva_vigente_falla(self, make_actividad, make_turno, make_user, make_reserva):
        turno = make_turno(make_actividad())
        make_reserva(make_user(), turno, date.today() + timedelta(days=5))
        with pytest.raises(ValueError, match="no pueden eliminarse"):
            svc.eliminar(turno.id)

    def test_sin_reservas_se_elimina(self, make_actividad, make_turno):
        turno = make_turno(make_actividad())
        eliminado = svc.eliminar(turno.id)
        assert eliminado.is_deleted

    def test_reserva_pasada_no_bloquea(self, make_actividad, make_turno, make_user, make_reserva):
        turno = make_turno(make_actividad())
        make_reserva(make_user(), turno, date.today() - timedelta(days=5))
        eliminado = svc.eliminar(turno.id)
        assert eliminado.is_deleted
