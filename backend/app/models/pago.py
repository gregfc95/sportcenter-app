from datetime import datetime, timezone
from enum import Enum

from .. import db
from .soft_delete import SoftDeleteMixin


class PagoEstado(str, Enum):
    PAGADO = "pagado"
    SENADO = "senado"
    CANCELADO = "cancelado"
    REEMBOLSADO = "reembolsado"


class Pago(SoftDeleteMixin, db.Model):
    __tablename__ = "pagos"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reserva_id = db.Column(
        db.Integer,
        db.ForeignKey("reservas.id", ondelete="RESTRICT"),
        nullable=False,
    )
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    estado = db.Column(
        db.Enum(
            PagoEstado,
            name="pago_estado",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )

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

    user = db.relationship("User", back_populates="pagos")
    reserva = db.relationship("Reserva", back_populates="pagos")

    def __repr__(self):
        return f"<Pago id={self.id} user={self.user_id} reserva={self.reserva_id} {self.estado}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reserva_id": self.reserva_id,
            "monto": float(self.monto) if self.monto is not None else None,
            "estado": self.estado.value if self.estado else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
