from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select

from .. import db
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.turno import Turno, DiaSemana
from ..models.clase import Clase


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
        clase_id: int,
        tipo: ReservaTipo = ReservaTipo.EVENTUAL,
    ) -> Reserva:


        clase = db.session.get(Clase, clase_id)
        
        if clase is None:
            raise ValueError("La clase indicada no existe.")

        self._validar_sin_conflicto_horario(user_id, clase)
        self._validar_cupo_disponible(clase)

        clase.cupo_disponible -= 1
        reserva = Reserva(user_id=user_id, clase_id=clase_id, tipo=tipo)
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

    def _validar_sin_conflicto_horario(self, user_id: int, clase: Clase) -> None:
        stmt = (
            select(Reserva)
            .join(Reserva.clase)
            .join(Clase.turno)
            .where(
                Reserva.user_id == user_id,
                Clase.fecha == clase.fecha,
                Turno.hora == clase.turno.hora,
            )
        )
        if db.session.execute(stmt).scalars().first() is not None:
            raise ValueError("Ya tenés un turno reservado para el mismo horario.")

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

    def _validar_cupo_disponible(self, clase: Clase) -> None:
        print("cupo disponible:", clase.cupo_disponible)
        if clase.cupo_disponible < 1:
            raise ValueError(
                f"El turno no tiene cupo disponible para el {clase.fecha.isoformat()}."
            )
        
    def obtener_por_usuario(self, user_id: int) -> list[Reserva]:
        stmt = select(Reserva).where(Reserva.user_id == user_id)
        return db.session.execute(stmt).scalars().all()
