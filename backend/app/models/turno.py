from datetime import datetime, timezone
from enum import Enum

from .. import db
from .soft_delete import SoftDeleteMixin


class DiaSemana(str, Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"


class Turno(SoftDeleteMixin, db.Model):
    __tablename__ = "turnos"

    id = db.Column(db.Integer, primary_key=True)
    actividad_id = db.Column(
        db.Integer,
        db.ForeignKey("actividades.id", ondelete="CASCADE"),
        nullable=False,
    )
    dia_semana = db.Column(
        db.Enum(
            DiaSemana,
            name="dia_semana",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    hora = db.Column(db.Time, nullable=False)
    cupo = db.Column(db.Integer, nullable=False)

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

    actividad = db.relationship("Actividad", back_populates="turnos")
    clases = db.relationship(
        "Clase",
        back_populates="turno",
        lazy=True,
        passive_deletes=True,
    )

    __table_args__ = (
        db.Index(
            "uq_actividad_dia_hora_active",
            "actividad_id", "dia_semana", "hora",
            unique=True,
            postgresql_where=db.text("deleted_at IS NULL"),
        ),
    )

    def __repr__(self):
        return (
            f"<Turno actividad_id={self.actividad_id} - {self.dia_semana} {self.hora}>"
        )

    def to_dict(self, disponibles=None):
        return {
            "id": self.id,
            "actividad": self.actividad.nombre,
            "dia_semana": self.dia_semana.value if self.dia_semana else None,
            "hora": self.hora.strftime("%H:%M"),
            "cupo": self.cupo,
            "disponibles": disponibles,
        }
