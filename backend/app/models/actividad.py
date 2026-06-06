from datetime import datetime, timezone
from .. import db
from .soft_delete import SoftDeleteMixin


class Actividad(SoftDeleteMixin, db.Model):
    __tablename__ = "actividades"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    precio = db.Column(db.Numeric(10, 2), nullable=False)

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

    turnos = db.relationship(
        "Turno",
        back_populates="actividad",
        lazy=True,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        db.Index(
            "uq_actividades_nombre_active",
            "nombre",
            unique=True,
            postgresql_where=db.text("deleted_at IS NULL"),
        ),
    )
