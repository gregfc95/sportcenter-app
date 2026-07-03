from datetime import datetime, timezone
from enum import Enum

from .. import db
from .soft_delete import SoftDeleteMixin


class PagoEstado(str, Enum):
    PAGADO = "pagado"
    SENADO = "senado"
    CANCELADO = "cancelado"
    REEMBOLSADO = "reembolsado"
    CREDITO = "credito"


class PagoMedio(str, Enum):
    MERCADO_PAGO = "mercado_pago"
    EFECTIVO = "efectivo"
    CREDITO_A_FAVOR = "credito_a_favor"


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
    registrado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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
    metodo = db.Column(
        db.Enum(
            PagoMedio,
            name="pago_medio",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=PagoMedio.MERCADO_PAGO,
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

    # `user` es el cliente dueño del pago; `registrado_por` es el empleado/admin
    # que lo cargó manualmente (NULL cuando el cobro fue automático por Mercado
    # Pago). Como hay dos FKs a users, hay que indicar foreign_keys en cada una.
    user = db.relationship("User", back_populates="pagos", foreign_keys=[user_id])
    registrado_por = db.relationship("User", foreign_keys=[registrado_por_id])
    reserva = db.relationship("Reserva", back_populates="pagos")
    # Créditos a favor que financiaron este pago (total o parcialmente).
    consumos = db.relationship("CreditoConsumo", back_populates="pago")

    def __repr__(self):
        return f"<Pago id={self.id} user={self.user_id} reserva={self.reserva_id} {self.estado}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "reserva_id": self.reserva_id,
            "monto": float(self.monto) if self.monto is not None else None,
            "estado": self.estado.value if self.estado else None,
            "metodo": self.metodo.value if self.metodo else None,
            "registrado_por_id": self.registrado_por_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
