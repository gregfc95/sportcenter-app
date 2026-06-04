from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select

from .. import db
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.turno import Turno, DiaSemana


CANCELACION_VENTANA = timedelta(hours=24)


WEEKDAY_TO_DIA_SEMANA = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}


class ReservaService:

    def crear_reserva(
        self,
        user_id: int,
        turno_id: int,
        fecha: date,
        tipo: ReservaTipo = ReservaTipo.EVENTUAL,
    ) -> Reserva:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            raise ValueError("El turno indicado no existe.")

        if tipo == ReservaTipo.EVENTUAL:
            self._validar_dia_semana(turno, fecha)
            self._validar_sin_conflicto_horario(user_id, fecha, turno)
            self._validar_cupo_disponible(turno, fecha)

        reserva = Reserva(
            user_id=user_id,
            turno_id=turno_id,
            fecha=fecha,
            tipo=tipo,
        )
        db.session.add(reserva)
        db.session.commit()
        return reserva

    def _validar_dia_semana(self, turno: Turno, fecha: date) -> None:
        esperado = WEEKDAY_TO_DIA_SEMANA[fecha.weekday()]
        if turno.dia_semana != esperado:
            raise ValueError(
                f"La fecha {fecha.isoformat()} cae en {esperado.value}, "
                f"pero el turno es de {turno.dia_semana.value}."
            )

    def _validar_sin_conflicto_horario(
        self, user_id: int, fecha: date, turno: Turno
    ) -> None:
        stmt = (
            select(Reserva)
            .join(Reserva.turno)
            .where(
                Reserva.user_id == user_id,
                Reserva.fecha == fecha,
                Reserva.tipo == ReservaTipo.EVENTUAL,
                Turno.hora == turno.hora,
            )
        )
        conflicto = db.session.execute(stmt).scalars().first()
        if conflicto is not None:
            raise ValueError("Ya tienes un turno reservado para el mismo horario")

    # --- Cancelación ---

    def cancelar_reserva(self, reserva_id: int) -> Reserva:
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        if reserva.tipo == ReservaTipo.EVENTUAL:
            reserva.motivo_cancelacion = self._motivo_segun_anticipacion(reserva)

        reserva.soft_delete()
        db.session.commit()
        return reserva

    def _motivo_segun_anticipacion(self, reserva: Reserva) -> MotivoCancelacion:
        inicio_reserva = datetime.combine(
            reserva.fecha, reserva.turno.hora, tzinfo=timezone.utc
        )
        anticipacion = inicio_reserva - datetime.now(tz=timezone.utc)
        if anticipacion > CANCELACION_VENTANA:
            return MotivoCancelacion.REEMBOLSADO
        return MotivoCancelacion.CANCELADO

    # --- Validaciones internas ---

    def _validar_cupo_disponible(self, turno: Turno, fecha: date) -> None:
        stmt = (
            select(func.count(Reserva.id))
            .where(
                Reserva.turno_id == turno.id,
                Reserva.fecha == fecha,
                Reserva.tipo == ReservaTipo.EVENTUAL,
            )
        )
        ocupados = db.session.execute(stmt).scalar()
        if ocupados >= turno.cupo:
            raise ValueError(
                f"El turno no tiene cupo disponible para el {fecha.isoformat()}."
            )
        
    def obtener_por_usuario(self, user_id: int) -> list[Reserva]:
        stmt = select(Reserva).where(Reserva.user_id == user_id)
        return db.session.execute(stmt).scalars().all()