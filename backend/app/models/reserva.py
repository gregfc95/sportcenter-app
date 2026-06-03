from datetime import datetime, timezone
from enum import Enum

from .. import db
from .soft_delete import SoftDeleteMixin


class ReservaTipo(str, Enum):
    EVENTUAL = "eventual"
    MENSUAL = "mensual"


class MotivoCancelacion(str, Enum):
    REEMBOLSADO = "reembolsado"
    CANCELADO = "cancelado"


class Reserva(SoftDeleteMixin, db.Model):
    __tablename__ = "reservas"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    clase_id = db.Column(
        db.Integer,
        db.ForeignKey("clases.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo = db.Column(
        db.Enum(
            ReservaTipo,
            name="reserva_tipo",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ReservaTipo.EVENTUAL,
    )
    motivo_cancelacion = db.Column(
        db.Enum(
            MotivoCancelacion,
            name="motivo_cancelacion",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=True,
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

    clase = db.relationship("Clase", back_populates="reservas")
    user = db.relationship("User", back_populates="reservas")
    pagos = db.relationship(
        "Pago",
        back_populates="reserva",
        lazy=True,
        passive_deletes="all",
    )

    __table_args__ = (
        db.Index(
            "uq_reserva_user_clase_active",
            "user_id",
            "clase_id",
            unique=True,
            postgresql_where=db.text("deleted_at IS NULL"),
        ),
    )

    def __init__(self, user_id, clase_id, tipo=ReservaTipo.EVENTUAL):
        self.user_id = user_id
        self.clase_id = clase_id
        self.tipo = tipo

    def __repr__(self):
        tipo = self.tipo.value if self.tipo else None
        return (
            f"<Reserva id={self.id} user={self.user_id} "
            f"clase={self.clase_id} tipo={tipo}>"
        )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "clase_id": self.clase_id,
            "tipo": self.tipo.value if self.tipo else None,
        }