from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models import Actividad
from ..models.reserva import MotivoCancelacion
from .pago_service import PagoService
from .reserva_service import ReservaService


class ActividadService:
    def __init__(self):
        self.reserva_service = ReservaService()
        self.pago_service = PagoService()

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
        """Da de baja (soft-delete) la actividad junto con sus turnos.

        Las reservas vigentes (de hoy en adelante) de esos turnos se cancelan y se
        reembolsan automáticamente: la baja es decisión del centro, no del cliente,
        así que corresponde devolver lo abonado sin importar la antelación. Las
        reservas ya pasadas se dejan intactas como registro histórico.
        """
        actividad = db.session.get(Actividad, actividad_id)
        if actividad is None:
            return None

        self._cancelar_reservas_vigentes(actividad)

        actividad.soft_delete()
        for turno in actividad.turnos:
            turno.soft_delete()
        db.session.commit()
        return actividad

    def _cancelar_reservas_vigentes(self, actividad: Actividad) -> None:
        """Cancela y reembolsa las reservas vigentes de todos los turnos.

        El filtro global de soft-delete deja fuera las reservas ya canceladas, así
        que solo se procesan las activas. `registrar_cancelacion` asienta el
        reembolso (devuelve None si no había nada cobrado: reserva pendiente, que
        igual se cancela como CANCELADO).
        """
        hoy = date.today()
        for turno in actividad.turnos:
            for reserva in [r for r in turno.reservas if r.fecha >= hoy]:
                registro = self.pago_service.registrar_cancelacion(
                    reserva.id, resolucion=PagoEstado.REEMBOLSADO
                )
                motivo = (
                    MotivoCancelacion.REEMBOLSADO
                    if registro is not None
                    else MotivoCancelacion.CANCELADO
                )
                self.reserva_service.cancelar_reserva(reserva.id, motivo=motivo)
