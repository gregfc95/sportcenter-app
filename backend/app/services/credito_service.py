from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from .. import db
from ..models.credito import Credito, CreditoConsumo
from ..models.pago import Pago
from ..models.reserva import Reserva


# Un crédito a favor vence a los 30 días de su creación si no se canjeó.
CREDITO_VIGENCIA = timedelta(days=30)


class CreditoService:
    """Créditos a favor: creación, vigencia, consumo y restauración.

    Las operaciones que mutan datos (`crear_desde_cancelacion`, `consumir`,
    `restaurar_consumos`) no hacen commit: se asientan en la misma transacción
    del `PagoService` que las orquesta, así crédito y pago quedan atómicos.
    """

    def crear_desde_cancelacion(self, reserva: Reserva, monto: Decimal) -> Credito:
        """Crea un crédito por `monto` para la actividad de la reserva cancelada.

        Vive 30 días desde ahora. La actividad sale del turno de la reserva, así
        el crédito solo se puede canjear pagando esa misma actividad.
        """
        credito = Credito(
            user_id=reserva.user_id,
            actividad_id=reserva.turno.actividad.id,
            reserva_id=reserva.id,
            monto_inicial=monto,
            saldo=monto,
            expira_at=datetime.now(timezone.utc) + CREDITO_VIGENCIA,
        )
        db.session.add(credito)
        return credito

    def vigentes(self, user_id: int, actividad_id: int) -> list[Credito]:
        """Créditos con saldo y sin vencer del usuario para una actividad.

        Ordenados por vencimiento ascendente: se consume primero el que expira
        antes, para minimizar el crédito que se pierde por vencimiento.
        """
        ahora = datetime.now(timezone.utc)
        stmt = (
            select(Credito)
            .where(
                Credito.user_id == user_id,
                Credito.actividad_id == actividad_id,
                Credito.saldo > 0,
                Credito.expira_at > ahora,
            )
            .order_by(Credito.expira_at.asc())
        )
        return db.session.execute(stmt).scalars().all()

    def saldo_disponible(self, user_id: int, actividad_id: int) -> Decimal:
        """Suma del saldo canjeable del usuario para una actividad."""
        return sum(
            (c.saldo for c in self.vigentes(user_id, actividad_id)), Decimal("0")
        )

    def consumir(self, pago: Pago, actividad_id: int) -> Decimal:
        """Aplica crédito vigente para financiar `pago`; devuelve lo consumido.

        Recorre los créditos vigentes (el que vence antes primero) tomando de
        cada uno hasta cubrir `pago.monto`, y asienta un `CreditoConsumo` por
        crédito tocado. Nunca consume más que el monto del pago ni que el saldo
        disponible (clamp), así el doble retorno de Mercado Pago vuelve a
        recomputar el mismo mínimo sin gastar de más.
        """
        restante = pago.monto
        consumido = Decimal("0")
        for credito in self.vigentes(pago.user_id, actividad_id):
            if restante <= 0:
                break
            aplicado = min(credito.saldo, restante)
            credito.saldo -= aplicado
            db.session.add(
                CreditoConsumo(credito=credito, pago=pago, monto=aplicado)
            )
            restante -= aplicado
            consumido += aplicado
        return consumido

    def restaurar_consumos(self, pagos: list[Pago]) -> Decimal:
        """Devuelve al crédito de origen lo consumido por `pagos`; total restaurado.

        Se usa al cancelar con beneficio una reserva que se había pagado con
        crédito: la porción de crédito vuelve a su crédito original (misma
        vigencia, sin renovar). Idempotente vía `restaurado_at`: un consumo ya
        restaurado se ignora.
        """
        pago_ids = [p.id for p in pagos]
        if not pago_ids:
            return Decimal("0")

        stmt = select(CreditoConsumo).where(
            CreditoConsumo.pago_id.in_(pago_ids),
            CreditoConsumo.restaurado_at.is_(None),
        )
        consumos = db.session.execute(stmt).scalars().all()

        ahora = datetime.now(timezone.utc)
        total = Decimal("0")
        for consumo in consumos:
            consumo.credito.saldo += consumo.monto
            consumo.restaurado_at = ahora
            total += consumo.monto
        return total

    def total_consumido(self, pagos: list[Pago]) -> Decimal:
        """Crédito total que financió esos pagos, restaurado o no.

        A diferencia de lo que devuelve `restaurar_consumos` (solo lo restaurado
        en esa llamada), esto es estable entre llamadas: la porción en crédito de
        un pago no cambia una vez asentada. Se usa para separar la parte en dinero
        de la parte en crédito al cerrar una cancelación de forma idempotente.
        """
        pago_ids = [p.id for p in pagos]
        if not pago_ids:
            return Decimal("0")
        stmt = select(CreditoConsumo.monto).where(
            CreditoConsumo.pago_id.in_(pago_ids)
        )
        return sum(db.session.execute(stmt).scalars().all(), Decimal("0"))

    def listar_vigentes_por_usuario(self, user_id: int) -> list[Credito]:
        """Créditos vigentes del usuario (todas las actividades) para el dashboard."""
        ahora = datetime.now(timezone.utc)
        stmt = (
            select(Credito)
            .where(
                Credito.user_id == user_id,
                Credito.saldo > 0,
                Credito.expira_at > ahora,
            )
            .options(joinedload(Credito.actividad))
            .order_by(Credito.expira_at.asc())
        )
        return db.session.execute(stmt).scalars().all()

    def por_reserva_origen(self, reserva_ids: list[int]) -> dict[int, Credito]:
        """Créditos indexados por la reserva que los originó (para Mis Pagos)."""
        if not reserva_ids:
            return {}
        stmt = select(Credito).where(Credito.reserva_id.in_(reserva_ids))
        creditos = db.session.execute(stmt).scalars().all()
        return {c.reserva_id: c for c in creditos}
