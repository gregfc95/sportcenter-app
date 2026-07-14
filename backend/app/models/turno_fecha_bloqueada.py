from datetime import datetime, timezone

from .. import db
from .soft_delete import SoftDeleteMixin


class TurnoFechaBloqueada(SoftDeleteMixin, db.Model):
    """Fecha puntual en la que un turno no se dicta (baja de esa sesión).

    El turno es una plantilla semanal; esta tabla representa la excepción "el
    turno del lunes 10:00 no ocurre el 2026-07-13". Bloquea nuevas reservas
    para esa fecha sin tocar el resto de las semanas.
    """

    __tablename__ = "turno_fechas_bloqueadas"

    id = db.Column(db.Integer, primary_key=True)
    turno_id = db.Column(
        db.Integer,
        db.ForeignKey("turnos.id", ondelete="CASCADE"),
        nullable=False,
    )
    fecha = db.Column(db.Date, nullable=False)
    # Admin que dio de baja la fecha, para auditoría.
    creado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
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

    turno = db.relationship("Turno", back_populates="fechas_bloqueadas")

    __table_args__ = (
        db.Index(
            "uq_turno_fecha_bloqueada_active",
            "turno_id", "fecha",
            unique=True,
            postgresql_where=db.text("deleted_at IS NULL"),
        ),
    )

    def __repr__(self):
        return f"<TurnoFechaBloqueada turno_id={self.turno_id} {self.fecha}>"
