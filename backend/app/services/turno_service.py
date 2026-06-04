from datetime import date, time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models.reserva import Reserva, ReservaTipo
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

    def _turno_superpuesto(
        self, turnos_existentes: list[Turno], hora_nueva: time
    ) -> Turno | None:
        """Devuelve el turno existente que se solapa con `hora_nueva`, o None.

        Devuelve el turno en conflicto (no un bool) para que el mensaje de error
        pueda mostrar su horario real, en vez del que se intenta cargar.
        """
        mins_nueva = hora_nueva.hour * 60 + hora_nueva.minute
        for turno in turnos_existentes:
            mins_turno = turno.hora.hour * 60 + turno.hora.minute
            if abs(mins_nueva - mins_turno) < SUPERPOSICION_MIN_MINUTOS:
                return turno
        return None

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

        conflicto = self._turno_superpuesto(turnos_existentes, hora)
        if conflicto is not None:
            hora_str = conflicto.hora.strftime("%H:%M")
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
            conflicto = self._turno_superpuesto(otros, nueva_hora)
            if conflicto is not None:
                hora_str = conflicto.hora.strftime("%H:%M")
                raise ValueError(
                    f"Ya existe un turno de esta actividad el {nuevo_dia} a las {hora_str}."
                )

        max_reservas = self._max_reservas_vigentes(turno)
        if nuevo_cupo < max_reservas:
            raise ValueError(
                "No es posible realizar el cambio. "
                f"Este Turno posee una cantidad de {max_reservas} Reservas."
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

    def _max_reservas_vigentes(self, turno: Turno) -> int:
        """Máximo de reservas eventuales activas en una misma sesión de hoy en adelante.

        Una "sesión" es el turno en una fecha concreta. El cupo se consume por
        sesión, así que el piso para bajar el cupo es la sesión más reservada que
        todavía no pasó. Las sesiones de días ya pasados no cuentan (el admin puede
        bajar el cupo aunque esos días hayan estado llenos). El filtro global de
        soft-delete descarta las reservas canceladas.
        """
        hoy = date.today()
        por_fecha: dict[date, int] = {}
        for r in turno.reservas:
            if r.fecha >= hoy and r.tipo == ReservaTipo.EVENTUAL:
                por_fecha[r.fecha] = por_fecha.get(r.fecha, 0) + 1
        return max(por_fecha.values(), default=0)

    def _tiene_reservas_vigentes(self, turno_id: int) -> bool:
        """True si el turno tiene reservas activas para hoy o fechas futuras.

        El filtro global de soft-delete descarta las reservas canceladas, así que
        solo cuentan las vigentes (pendientes, señadas o pagadas). Las reservas de
        días ya pasados no impiden la eliminación.
        """
        hoy = date.today()
        stmt = (
            select(Reserva.id)
            .where(Reserva.turno_id == turno_id, Reserva.fecha >= hoy)
            .limit(1)
        )
        return db.session.execute(stmt).first() is not None

    def eliminar(self, turno_id: int) -> Turno | None:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return None

        if self._tiene_reservas_vigentes(turno_id):
            raise ValueError("Turnos con Reservas no pueden eliminarse")

        turno.soft_delete()
        db.session.commit()
        return turno
