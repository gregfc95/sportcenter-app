"""Tests de `ReservaService` contra la base de datos de tests."""

from datetime import date, timedelta

import pytest

from app.models.reserva import MotivoCancelacion, ReservaTipo
from app.models.turno import DiaSemana
from app.services.reserva_service import ReservaService

svc = ReservaService()


class TestCrearReserva:
    def test_reserva_exitosa(self, make_user, make_actividad, make_turno, next_date_for):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)

        reserva = svc.crear_reserva(user.id, turno.id, fecha)

        assert reserva.id is not None
        assert reserva.fecha == fecha
        assert reserva.tipo == ReservaTipo.EVENTUAL

    def test_turno_inexistente(self, make_user, next_date_for):
        user = make_user()
        with pytest.raises(ValueError):
            svc.crear_reserva(user.id, 9999, next_date_for(DiaSemana.LUNES))

    def test_dia_de_semana_incorrecto(self, make_user, make_actividad, make_turno, next_date_for):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha_martes = next_date_for(DiaSemana.MARTES)
        with pytest.raises(ValueError, match="martes"):
            svc.crear_reserva(user.id, turno.id, fecha_martes)

    def test_turno_pasado(self, make_user, make_actividad, make_turno, past_date_for):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        with pytest.raises(ValueError, match="pasó"):
            svc.crear_reserva(user.id, turno.id, past_date_for(DiaSemana.LUNES))

    def test_conflicto_de_horario(self, make_user, make_actividad, make_turno, next_date_for):
        from datetime import time

        user = make_user()
        turno_a = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, hora=time(16, 0))
        turno_b = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, hora=time(16, 30))
        fecha = next_date_for(DiaSemana.LUNES)

        svc.crear_reserva(user.id, turno_a.id, fecha)
        with pytest.raises(ValueError, match="mismo horario"):
            svc.crear_reserva(user.id, turno_b.id, fecha)

    def test_sin_cupo(self, make_user, make_actividad, make_turno, next_date_for):
        user1, user2 = make_user(), make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=1)
        fecha = next_date_for(DiaSemana.LUNES)

        svc.crear_reserva(user1.id, turno.id, fecha)
        with pytest.raises(ValueError, match="cupo"):
            svc.crear_reserva(user2.id, turno.id, fecha)

    def test_mensual_saltea_validaciones(self, make_user, make_actividad, make_turno, next_date_for):
        # Una MENSUAL no valida día de semana ni cupo: la fecha cae martes pero
        # el turno es lunes y aun así se crea.
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha_martes = next_date_for(DiaSemana.MARTES)

        reserva = svc.crear_reserva(user.id, turno.id, fecha_martes, tipo=ReservaTipo.MENSUAL)
        assert reserva.id is not None
        assert reserva.tipo == ReservaTipo.MENSUAL


class TestCancelarReserva:
    def test_reembolsable_por_anticipacion(self, make_user, make_actividad, make_turno, next_date_for):
        # next_date_for cae a 7+ días -> más de 24 h -> reembolsable.
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        reserva = svc.crear_reserva(user.id, turno.id, next_date_for(DiaSemana.LUNES))

        cancelada = svc.cancelar_reserva(reserva.id)
        assert cancelada.motivo_cancelacion == MotivoCancelacion.REEMBOLSADO
        assert cancelada.is_deleted

    def test_motivo_explicito_se_respeta(self, make_user, make_actividad, make_turno, next_date_for):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        reserva = svc.crear_reserva(user.id, turno.id, next_date_for(DiaSemana.LUNES))

        cancelada = svc.cancelar_reserva(reserva.id, motivo=MotivoCancelacion.CANCELADO)
        assert cancelada.motivo_cancelacion == MotivoCancelacion.CANCELADO


class TestListarPorUsuario:
    def test_excluye_pasadas_y_ordena_ascendente(self, make_user, make_actividad, make_turno, make_reserva):
        user = make_user()
        turno = make_turno(make_actividad())
        hoy = date.today()
        # Distintas fechas (el índice único es por user+turno+fecha).
        make_reserva(user, turno, hoy - timedelta(days=3))   # pasada -> excluida
        make_reserva(user, turno, hoy + timedelta(days=10))
        make_reserva(user, turno, hoy + timedelta(days=3))

        reservas = svc.listar_por_usuario(user.id)
        fechas = [r.fecha for r in reservas]
        assert fechas == [hoy + timedelta(days=3), hoy + timedelta(days=10)]

    def test_excluye_canceladas(self, make_user, make_actividad, make_turno, make_reserva):
        user = make_user()
        turno = make_turno(make_actividad())
        reserva = make_reserva(user, turno, date.today() + timedelta(days=5))

        svc.cancelar_reserva(reserva.id)
        assert svc.listar_por_usuario(user.id) == []
