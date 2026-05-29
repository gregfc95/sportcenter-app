from decimal import Decimal

from sqlalchemy import select

from .. import db
from ..models.pago import Pago, PagoEstado
from ..models.reserva import Reserva


class PagoService:

    # --- Creación y avance del pago ---

    def iniciar_pago(self, reserva_id: int) -> Pago:
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        if self._pago_existente(reserva_id) is not None:
            raise ValueError("Ya existe un pago para esta reserva.")

        precio = reserva.turno.actividad.precio
        monto = precio / Decimal("2")

        pago = Pago(
            user_id=reserva.user_id,
            reserva_id=reserva_id,
            monto=monto,
            estado=PagoEstado.SENADO,
        )
        db.session.add(pago)
        db.session.commit()
        return pago

    def completar_pago(self, reserva_id: int) -> Pago:
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        pago = self._pago_existente(reserva_id)
        if pago is None:
            raise ValueError("No existe un pago para esta reserva.")

        if pago.estado == PagoEstado.PAGADO:
            raise ValueError("El pago ya está completo.")

        pago.estado = PagoEstado.PAGADO
        pago.monto = reserva.turno.actividad.precio
        db.session.commit()
        return pago

    # --- Queries ---

    def _pago_existente(self, reserva_id: int) -> Pago | None:
        stmt = select(Pago).where(Pago.reserva_id == reserva_id)
        return db.session.execute(stmt).scalars().first()
