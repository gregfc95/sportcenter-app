from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models.clase import Clase
from ..models.turno import Turno
from ..services.reserva_service import WEEKDAY_TO_DIA_SEMANA


class ClaseService:

    def obtener_por_id(self, clase_id: int) -> Clase | None:
        return db.session.get(Clase, clase_id)

    def obtener_por_turno(self, turno_id: int) -> list[Clase]:
        stmt = select(Clase).where(Clase.turno_id == turno_id)
        return db.session.execute(stmt).scalars().all()

    def obtener_por_turno_y_fecha(self, turno_id: int, fecha: date) -> Clase | None:
        stmt = select(Clase).where(Clase.turno_id == turno_id, Clase.fecha == fecha)
        return db.session.execute(stmt).scalars().first()

    def obtener_o_crear(self, turno_id: int, fecha: date) -> Clase:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            raise ValueError("El turno indicado no existe.")

        self.validar_dia_semana(turno, fecha)

        clase = self.obtener_por_turno_y_fecha(turno_id, fecha)

        if clase is None:
            clase = Clase(turno_id=turno_id, fecha=fecha, cupo_disponible=turno.cupo)
            db.session.add(clase)
            try:
                db.session.flush()
            except IntegrityError:
                db.session.rollback()
                raise ValueError("Ya existe una clase para ese turno y fecha.")

        return clase

    def validar_dia_semana(self, turno: Turno, fecha: date) -> None:
        esperado = WEEKDAY_TO_DIA_SEMANA[fecha.weekday()]
        if turno.dia_semana != esperado:
            raise ValueError(
                f"La fecha {fecha.isoformat()} cae en {esperado.value}, "
                f"pero el turno es de {turno.dia_semana.value}."
            )