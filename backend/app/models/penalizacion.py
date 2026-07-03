from datetime import datetime, timezone
from enum import Enum

from .. import db


class PenalizacionMotivo(str, Enum):
    CANCELACION_CLASE = "cancelacion_clase"   # clase mensual cancelada por el cliente
    RENOVACION_IMPAGA = "renovacion_impaga"   # clase de renovación que pasó sin pagarse


class Penalizacion(db.Model):
    """Registro inmutable de una penalización mensual de un cliente.

    Es un ledger, no una entidad con estado: no usa soft-delete. El conteo "del
    mes" (que fija el descuento de fidelidad) se hace por `created_at`, sin
    resetear nada. La restricción única (reserva, motivo) es la clave de
    idempotencia: una clase penaliza a lo sumo una vez por motivo, así los jobs
    diarios se pueden re-correr sin duplicar.
    """

    __tablename__ = "penalizaciones"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reserva_id = db.Column(
        db.Integer,
        db.ForeignKey("reservas.id", ondelete="CASCADE"),
        nullable=False,
    )
    motivo = db.Column(
        db.Enum(
            PenalizacionMotivo,
            name="penalizacion_motivo",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "reserva_id", "motivo", name="uq_penalizacion_reserva_motivo"
        ),
        db.Index("ix_penalizaciones_user_created", "user_id", "created_at"),
    )

    def __init__(self, user_id, reserva_id, motivo):
        self.user_id = user_id
        self.reserva_id = reserva_id
        self.motivo = motivo

    def __repr__(self):
        motivo = self.motivo.value if self.motivo else None
        return (
            f"<Penalizacion id={self.id} user={self.user_id} "
            f"reserva={self.reserva_id} motivo={motivo}>"
        )
