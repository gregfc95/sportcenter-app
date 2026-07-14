from datetime import datetime, timezone

from .. import db
from .soft_delete import SoftDeleteMixin


class Credito(SoftDeleteMixin, db.Model):
    """Crédito a favor de un cliente para una actividad puntual.

    Nace cuando el cliente cancela una clase de un abono mensual con más de 48 h
    de anticipación y elige "crédito a favor" en lugar del reembolso. Solo se
    puede canjear pagando esa misma actividad; vence a los 30 días si no se usa.

    El `saldo` es divisible: un crédito puede cubrir parte de un pago (una seña,
    una clase de un abono) y dejar remanente para el siguiente. Su consumo se
    asienta en `CreditoConsumo`; el estado (vigente/vencido/consumido) se deriva
    de `saldo` y `expira_at`, sin columna ni job de expiración.
    """

    __tablename__ = "creditos"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    actividad_id = db.Column(
        db.Integer,
        db.ForeignKey("actividades.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Reserva mensual cancelada que originó el crédito. Única: cada cancelación
    # con crédito genera exactamente un crédito, lo que da idempotencia natural.
    reserva_id = db.Column(
        db.Integer,
        db.ForeignKey("reservas.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    monto_inicial = db.Column(db.Numeric(10, 2), nullable=False)
    saldo = db.Column(db.Numeric(10, 2), nullable=False)
    expira_at = db.Column(db.DateTime(timezone=True), nullable=False)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = db.relationship("User", foreign_keys=[user_id])
    actividad = db.relationship("Actividad", foreign_keys=[actividad_id])
    reserva = db.relationship("Reserva", foreign_keys=[reserva_id])
    consumos = db.relationship("CreditoConsumo", back_populates="credito")

    @property
    def vigente(self) -> bool:
        """Tiene saldo y todavía no venció (canjeable ahora mismo)."""
        return self.saldo > 0 and self.expira_at > datetime.now(timezone.utc)

    @property
    def vencido(self) -> bool:
        """Tenía saldo pero pasó su vigencia: el saldo se pierde."""
        return self.saldo > 0 and self.expira_at <= datetime.now(timezone.utc)

    def __repr__(self):
        return (
            f"<Credito id={self.id} user={self.user_id} "
            f"actividad={self.actividad_id} saldo={self.saldo}>"
        )

    def to_dict(self):
        return {
            "id": self.id,
            "actividad_id": self.actividad_id,
            "reserva_id": self.reserva_id,
            "monto_inicial": float(self.monto_inicial),
            "saldo": float(self.saldo),
            "expira_at": self.expira_at.isoformat() if self.expira_at else None,
            "vencido": self.vencido,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CreditoConsumo(db.Model):
    """Uso de un crédito para financiar (total o parcialmente) un pago.

    La relación crédito↔pago es N:M: un pago (ej. un abono mensual) puede
    consumir varios créditos, y un crédito puede repartirse entre varios pagos
    (las clases de un abono). `restaurado_at` marca los consumos devueltos al
    saldo de origen cuando el pago que financiaron se cancela con beneficio.
    """

    __tablename__ = "credito_consumos"

    id = db.Column(db.Integer, primary_key=True)
    credito_id = db.Column(
        db.Integer,
        db.ForeignKey("creditos.id", ondelete="CASCADE"),
        nullable=False,
    )
    pago_id = db.Column(
        db.Integer,
        db.ForeignKey("pagos.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    restaurado_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    credito = db.relationship("Credito", back_populates="consumos")
    pago = db.relationship("Pago", back_populates="consumos")

    def __repr__(self):
        return (
            f"<CreditoConsumo id={self.id} credito={self.credito_id} "
            f"pago={self.pago_id} monto={self.monto}>"
        )
