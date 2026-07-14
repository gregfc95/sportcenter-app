"""Tests de `ReservaService` contra la base de datos de tests."""

from datetime import date, time, timedelta

import pytest

from app import db
from app.models.reserva import MotivoCancelacion, ReservaTipo
from app.models.turno import DiaSemana
from app.models.turno_fecha_bloqueada import TurnoFechaBloqueada
from app.services.reserva_service import ReservaService, fechas_mensuales

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

    def test_eventual_no_puede_pisar_una_mensual(self, make_user, make_actividad, make_turno, next_date_for):
        # Los abonados mensuales consumen cupo: con cupo=1 y un abono creado,
        # otra persona no puede reservar eventual en una fecha del abono.
        abonado, otro = make_user(), make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=1)
        fecha = next_date_for(DiaSemana.LUNES)

        svc.crear_reserva_mensual(abonado.id, turno.id, fecha)
        with pytest.raises(ValueError, match="cupo"):
            svc.crear_reserva(otro.id, turno.id, fecha)


class TestCrearReservaMensual:
    def test_abona_todas_las_fechas_restantes_del_mes(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)

        reservas = svc.crear_reserva_mensual(user.id, turno.id, fecha)

        assert [r.fecha for r in reservas] == fechas_mensuales(fecha)
        assert all(r.tipo == ReservaTipo.MENSUAL for r in reservas)
        assert all(r.id is not None for r in reservas)
        assert 1 <= len(reservas) <= 5

    def test_comparten_grupo_id(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)

        reservas = svc.crear_reserva_mensual(user.id, turno.id, fecha)

        gids = {r.grupo_id for r in reservas}
        assert len(gids) == 1
        assert reservas[0].grupo_id is not None

    def test_turno_inexistente(self, make_user, next_date_for):
        user = make_user()
        with pytest.raises(ValueError):
            svc.crear_reserva_mensual(user.id, 9999, next_date_for(DiaSemana.LUNES))

    def test_dia_de_semana_incorrecto(self, make_user, make_actividad, make_turno, next_date_for):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        with pytest.raises(ValueError, match="martes"):
            svc.crear_reserva_mensual(user.id, turno.id, next_date_for(DiaSemana.MARTES))

    def test_fecha_pasada(self, make_user, make_actividad, make_turno, past_date_for):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        with pytest.raises(ValueError, match="pasó"):
            svc.crear_reserva_mensual(user.id, turno.id, past_date_for(DiaSemana.LUNES))

    def test_conflicto_en_una_fecha_no_crea_nada(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        # Todo-o-nada: una eventual en la ÚLTIMA fecha del abono (mismo horario,
        # otra actividad) rechaza el abono entero y no persiste ninguna clase.
        user = make_user()
        turno_a = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, hora=time(16, 0))
        turno_b = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, hora=time(16, 30))
        fecha = next_date_for(DiaSemana.LUNES)
        ultima = fechas_mensuales(fecha)[-1]

        svc.crear_reserva(user.id, turno_a.id, ultima)
        with pytest.raises(ValueError, match="mismo horario"):
            svc.crear_reserva_mensual(user.id, turno_b.id, fecha)

        reservas = svc.listar_por_usuario(user.id)
        assert [r.tipo for r in reservas] == [ReservaTipo.EVENTUAL]

    def test_cupo_lleno_en_una_fecha_no_crea_nada(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        # Todo-o-nada también por cupo: el turno está lleno solo en la última
        # fecha del mes (por otra persona) y el abono completo se rechaza.
        abonado, otro = make_user(), make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, cupo=1)
        fecha = next_date_for(DiaSemana.LUNES)
        ultima = fechas_mensuales(fecha)[-1]

        svc.crear_reserva(otro.id, turno.id, ultima)
        with pytest.raises(ValueError, match="cupo"):
            svc.crear_reserva_mensual(abonado.id, turno.id, fecha)

        assert svc.listar_por_usuario(abonado.id) == []

    def test_no_permite_dos_abonos_del_mismo_mes(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)

        svc.crear_reserva_mensual(user.id, turno.id, fecha)
        with pytest.raises(ValueError):
            svc.crear_reserva_mensual(user.id, turno.id, fecha)


class TestGrupoMensual:
    def test_devuelve_el_abono_completo_ordenado(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)
        reservas = svc.crear_reserva_mensual(user.id, turno.id, fecha)

        grupo = svc.grupo_mensual(reservas[-1])
        assert [r.id for r in grupo] == [r.id for r in reservas]

    def test_excluye_clases_canceladas(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)
        reservas = svc.crear_reserva_mensual(user.id, turno.id, fecha)

        svc.cancelar_reserva(reservas[0].id)
        grupo = svc.grupo_mensual(reservas[-1])
        assert [r.id for r in grupo] == [r.id for r in reservas[1:]]

    def test_incluye_canceladas_con_flag(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)
        reservas = svc.crear_reserva_mensual(user.id, turno.id, fecha)

        svc.cancelar_reserva(reservas[0].id)
        grupo = svc.grupo_mensual(reservas[-1], include_canceladas=True)
        assert [r.id for r in grupo] == [r.id for r in reservas]
        assert grupo[0].is_deleted
        assert not any(r.is_deleted for r in grupo[1:])

    def test_aisla_generaciones_del_mismo_mes(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        # Regresión del bug de chips duplicados: reservar el mismo mes tras
        # cancelar arma otro grupo, y el grupo del abono vigente no arrastra las
        # clases canceladas de la generación anterior.
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)

        gen1 = svc.crear_reserva_mensual(user.id, turno.id, fecha)
        for r in gen1:
            svc.cancelar_reserva(r.id)
        gen2 = svc.crear_reserva_mensual(user.id, turno.id, fecha)
        svc.cancelar_reserva(gen2[0].id)

        assert gen1[0].grupo_id != gen2[0].grupo_id

        grupo = svc.grupo_mensual(gen2[-1], include_canceladas=True)
        assert {r.grupo_id for r in grupo} == {gen2[0].grupo_id}
        fechas = [r.fecha for r in grupo]
        assert len(fechas) == len(set(fechas))
        assert len(grupo) == len(gen2)

    def test_una_eventual_es_su_propio_grupo(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        reserva = svc.crear_reserva(user.id, turno.id, next_date_for(DiaSemana.LUNES))
        assert svc.grupo_mensual(reserva) == [reserva]


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


class TestFechasBloqueadas:
    """Reservas contra fechas dadas de baja por el centro (`turno_fechas_bloqueadas`)."""

    def _bloquear(self, turno, fecha):
        db.session.add(TurnoFechaBloqueada(turno_id=turno.id, fecha=fecha))
        db.session.commit()

    def test_eventual_sobre_fecha_bloqueada_falla(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)
        self._bloquear(turno, fecha)

        with pytest.raises(ValueError, match="no está disponible"):
            svc.crear_reserva(user.id, turno.id, fecha)

    def test_otro_turno_misma_fecha_no_se_bloquea(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        # El bloqueo es por turno, no por día del centro.
        user = make_user()
        turno_a = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, hora=time(10, 0))
        turno_b = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES, hora=time(16, 0))
        fecha = next_date_for(DiaSemana.LUNES)
        self._bloquear(turno_a, fecha)

        reserva = svc.crear_reserva(user.id, turno_b.id, fecha)
        assert reserva.id is not None

    def test_mensual_saltea_la_fecha_bloqueada(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        # Fecha de inicio con al menos dos clases restantes en el mes, para que
        # el salteo deje un abono no vacío.
        fecha = next_date_for(DiaSemana.LUNES)
        while len(fechas_mensuales(fecha)) < 2:
            fecha += timedelta(days=7)
        bloqueada = fechas_mensuales(fecha)[1]
        self._bloquear(turno, bloqueada)

        reservas = svc.crear_reserva_mensual(user.id, turno.id, fecha)

        esperadas = [f for f in fechas_mensuales(fecha) if f != bloqueada]
        assert [r.fecha for r in reservas] == esperadas

    def test_mensual_con_todas_las_fechas_bloqueadas_falla(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        fecha = next_date_for(DiaSemana.LUNES)
        for f in fechas_mensuales(fecha):
            self._bloquear(turno, f)

        with pytest.raises(ValueError, match="clases disponibles"):
            svc.crear_reserva_mensual(user.id, turno.id, fecha)
