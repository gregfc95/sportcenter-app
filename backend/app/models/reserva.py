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
    CREDITO = "credito"


class Reserva(SoftDeleteMixin, db.Model):
    __tablename__ = "reservas"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    turno_id = db.Column(
        db.Integer,
        db.ForeignKey("turnos.id", ondelete="CASCADE"),
        nullable=False,
    )
    fecha = db.Column(db.Date, nullable=False)
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
    # Identidad del abono mensual: todas las clases de una misma compra
    # comparten `grupo_id`. Reservar de nuevo el mismo mes (tras cancelar) crea
    # otro grupo, así las generaciones canceladas no se mezclan. Null en las
    # eventuales (grupo de una) y hasta el backfill de filas viejas.
    grupo_id = db.Column(db.String(32), nullable=True, index=True)

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

    turno = db.relationship("Turno", back_populates="reservas")
    user = db.relationship("User", back_populates="reservas")
    pagos = db.relationship(
        "Pago",
        back_populates="reserva",
        lazy=True,
        passive_deletes="all",
    )

    __table_args__ = (
        db.Index(
            "uq_reserva_user_turno_fecha_active",
            "user_id",
            "turno_id",
            "fecha",
            unique=True,
            postgresql_where=db.text("deleted_at IS NULL"),
        ),
    )

    def __init__(
        self, user_id, turno_id, fecha, tipo=ReservaTipo.EVENTUAL, grupo_id=None
    ):
        self.user_id = user_id
        self.turno_id = turno_id
        self.fecha = fecha
        self.tipo = tipo
        self.grupo_id = grupo_id

    def __repr__(self):
        tipo = self.tipo.value if self.tipo else None
        return (
            f"<Reserva id={self.id} user={self.user_id} "
            f"turno={self.turno_id} fecha={self.fecha} tipo={tipo}>"
        )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "turno_id": self.turno_id,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "tipo": self.tipo.value if self.tipo else None,
        }
