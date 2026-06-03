from datetime import datetime, timezone

from .. import db
from .soft_delete import SoftDeleteMixin


class Clase(SoftDeleteMixin, db.Model):
    __tablename__ = "clases"

    id = db.Column(db.Integer, primary_key=True)
    turno_id = db.Column(
        db.Integer,
        db.ForeignKey("turnos.id", ondelete="CASCADE"),
        nullable=False,
    )
    fecha = db.Column(db.Date, nullable=False)
    cupo_disponible = db.Column(db.Integer, nullable=False)

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

    turno = db.relationship("Turno", back_populates="clases")
    reservas = db.relationship(
        "Reserva",
        back_populates="clase",
        lazy=True,
        passive_deletes=True,
    )

    __table_args__ = (
        db.UniqueConstraint("turno_id", "fecha", name="uq_clase_turno_fecha"),
    )

    def __init__(self, turno_id, fecha, cupo_disponible):
        self.turno_id = turno_id
        self.fecha = fecha
        self.cupo_disponible = cupo_disponible

    def __repr__(self):
        return f"<Clase turno={self.turno_id} fecha={self.fecha} cupo={self.cupo_disponible}>"

    def to_dict(self):
        return {
            "id": self.id,
            "turno_id": self.turno_id,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "cupo_disponible": self.cupo_disponible,
        }