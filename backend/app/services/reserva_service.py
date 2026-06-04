from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from .. import db
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.turno import Turno, DiaSemana


CANCELACION_VENTANA = timedelta(hours=24)

# La `hora` del turno es hora de pared local de Argentina (así se agenda y se
# muestra), no UTC. Para medir la anticipación real hay que interpretarla en
# esta zona.
AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


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

    def listar_por_usuario(self, user_id: int) -> list[Reserva]:
        """Reservas activas del usuario de hoy en adelante, próximas primero.

        Excluye turnos pasados (fecha anterior a hoy). Los de hoy se siguen
        mostrando aunque el horario ya haya pasado.
        """
        hoy = date.today()
        stmt = (
            select(Reserva)
            .where(Reserva.user_id == user_id, Reserva.fecha >= hoy)
            .order_by(Reserva.fecha.asc())
        )
        return db.session.execute(stmt).scalars().all()

    def listar_sesiones_reservadas(self) -> list[tuple[Turno, date]]:
        """Sesiones (turno + fecha) con al menos una reserva activa, de hoy en adelante.

        Una "sesión" es la instancia de un turno semanal en una fecha concreta. Para
        la vista de administración de turnos reservados: agrupa las reservas activas
        por (turno, fecha) —el filtro de soft-delete descarta las canceladas— y
        devuelve cada sesión, próximas primero y ordenadas por horario. No incluye
        sesiones sin reservas.
        """
        hoy = date.today()
        stmt = (
            select(Reserva.turno_id, Reserva.fecha)
            .join(Reserva.turno)
            .where(Reserva.fecha >= hoy)
            .group_by(Reserva.turno_id, Reserva.fecha, Turno.hora)
            .order_by(Reserva.fecha.asc(), Turno.hora.asc())
        )
        rows = db.session.execute(stmt).all()

        sesiones = []
        for turno_id, fecha in rows:
            turno = db.session.get(Turno, turno_id)
            if turno is not None:
                sesiones.append((turno, fecha))
        return sesiones

    def listar_por_turno_fecha(self, turno_id: int, fecha: date) -> list[Reserva]:
        """Reservas activas de una sesión (turno + fecha) con su cliente y pagos.

        Para el detalle de una sesión en la vista de administración: carga el usuario
        y los pagos de cada reserva para mostrar quién reservó y en qué estado de pago
        está. El filtro de soft-delete excluye las reservas canceladas.
        """
        stmt = (
            select(Reserva)
            .where(Reserva.turno_id == turno_id, Reserva.fecha == fecha)
            .options(joinedload(Reserva.user), joinedload(Reserva.pagos))
            .order_by(Reserva.created_at.asc())
        )
        return db.session.execute(stmt).unique().scalars().all()

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

    def es_reembolsable(self, reserva: Reserva) -> bool:
        """True si la reserva se cancela con más de 24 h de anticipación.

        Determina si la cancelación da derecho a reembolso de lo abonado.
        """
        inicio_reserva = datetime.combine(
            reserva.fecha, reserva.turno.hora, tzinfo=AR_TZ
        )
        anticipacion = inicio_reserva - datetime.now(tz=AR_TZ)
        return anticipacion > CANCELACION_VENTANA

    def _motivo_segun_anticipacion(self, reserva: Reserva) -> MotivoCancelacion:
        if self.es_reembolsable(reserva):
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