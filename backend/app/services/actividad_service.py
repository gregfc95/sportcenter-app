from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models import Actividad


class ActividadService:
    def obtener_todas(self) -> list[Actividad]:
        return db.session.execute(select(Actividad)).scalars().all()

    def obtener_por_id(self, actividad_id: int) -> Actividad | None:
        return db.session.get(Actividad, actividad_id)

    def crear(self, data: dict) -> Actividad:
        actividad = Actividad(nombre=data["nombre"], precio=data["precio"])
        db.session.add(actividad)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("El nombre ya esta en uso")
        return actividad

    def actualizar(self, actividad_id: int, data: dict) -> Actividad | None:
        actividad = db.session.get(Actividad, actividad_id)
        if actividad is None:
            return None

        actividad.nombre = data["nombre"]
        actividad.precio = data["precio"]

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("El nombre ya esta en uso")
        return actividad

    def eliminar(self, actividad_id: int) -> Actividad | None:
        actividad = db.session.get(Actividad, actividad_id)
        if actividad is None:
            return None

        actividad.soft_delete()
        for turno in actividad.turnos:
            turno.soft_delete()
        db.session.commit()
        return actividad
