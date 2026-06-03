from datetime import date, time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models.reserva import ReservaTipo
from ..models.turno import Turno


SUPERPOSICION_MIN_MINUTOS = 60


class TurnoService:

    # --- Lógica de negocio de reservas y cupo ---

    def cantidad_reservas(self, turno: Turno, fecha: date) -> int:
        return sum(
            1
            for r in turno.reservas
            if r.fecha == fecha and r.tipo == ReservaTipo.EVENTUAL
        )

    def hay_cupo(self, turno: Turno, fecha: date) -> bool:
        return self.cantidad_reservas(turno, fecha) < turno.cupo

    def lugares_disponibles(self, turno: Turno, fecha: date) -> int:
        return turno.cupo - self.cantidad_reservas(turno, fecha)

    # --- Lógica de superposición de horarios ---

    def _hay_superposicion(
        self, turnos_existentes: list[Turno], hora_nueva: time
    ) -> bool:
        mins_nueva = hora_nueva.hour * 60 + hora_nueva.minute
        for turno in turnos_existentes:
            mins_turno = turno.hora.hour * 60 + turno.hora.minute
            if abs(mins_nueva - mins_turno) < SUPERPOSICION_MIN_MINUTOS:
                return True
        return False

    # --- Queries ---

    def obtener_todos(self) -> list[Turno]:
        return db.session.execute(select(Turno)).scalars().all()

    def obtener_por_id(self, turno_id: int) -> Turno | None:
        return db.session.get(Turno, turno_id)

    def obtener_por_actividad(self, actividad_id: int) -> list[Turno]:
        stmt = select(Turno).where(Turno.actividad_id == actividad_id)
        return db.session.execute(stmt).scalars().all()

    def _turnos_por_actividad_y_dia(
        self, actividad_id: int, dia_semana: str
    ) -> list[Turno]:
        stmt = select(Turno).where(
            Turno.actividad_id == actividad_id,
            Turno.dia_semana == dia_semana,
        )
        return db.session.execute(stmt).scalars().all()

    # --- CRUD ---

    def crear_turno(self, data: dict) -> Turno:
        actividad_id = data["actividad_id"]
        dia_semana = data["dia_semana"]
        hora = data["hora"]
        cupo = data["cupo"]

        turnos_existentes = self._turnos_por_actividad_y_dia(actividad_id, dia_semana)

        if self._hay_superposicion(turnos_existentes, hora):
            hora_str = hora.strftime("%H:%M")
            raise ValueError(
                f"Ya existe un turno de esta actividad el {dia_semana} a las {hora_str}."
            )

        turno = Turno(
            actividad_id=actividad_id,
            dia_semana=dia_semana,
            hora=hora,
            cupo=cupo,
        )
        db.session.add(turno)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Ya existe un turno con esos datos.")
        return turno

    def actualizar(self, turno_id: int, data: dict) -> Turno | None:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return None

        nuevo_dia = data["dia_semana"]
        nueva_hora = data["hora"]
        nuevo_cupo = data["cupo"]

        if nuevo_dia != turno.dia_semana or nueva_hora != turno.hora:
            otros = [
                t for t in self._turnos_por_actividad_y_dia(turno.actividad_id, nuevo_dia)
                if t.id != turno.id
            ]
            if self._hay_superposicion(otros, nueva_hora):
                hora_str = nueva_hora.strftime("%H:%M")
                raise ValueError(
                    f"Ya existe un turno de esta actividad el {nuevo_dia} a las {hora_str}."
                )

        turno.dia_semana = nuevo_dia
        turno.hora = nueva_hora
        turno.cupo = nuevo_cupo

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Ya existe un turno con esos datos.")
        return turno

    def eliminar(self, turno_id: int) -> Turno | None:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return None

        turno.soft_delete()
        db.session.commit()
        return turno
    
    def appointment_modification(self, turno_id: int, nuevo_cupo: int) -> Turno | None:
        turno = db.session.get(Turno, turno_id)

        if turno is None:
            raise ValueError("El turno no existe.")

        if nuevo_cupo is None or not isinstance(nuevo_cupo, int) or nuevo_cupo < 1:
            raise ValueError("El cupo debe ser un número entero mayor a 0.")

        reservas_activas = sum(1 for r in turno.reservas)
        if nuevo_cupo < reservas_activas:
            raise ValueError(
                f"No podés reducir el cupo a {nuevo_cupo}. "
                f"Ya hay {reservas_activas} persona{'s' if reservas_activas != 1 else ''} "
                f"inscripta{'s' if reservas_activas != 1 else ''}."
            )

        turno.cupo = nuevo_cupo

        db.session.commit()
        return turno
