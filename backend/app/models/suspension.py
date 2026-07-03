from datetime import datetime, timezone

from .. import db


class Suspension(db.Model):
    """Suspensión de un cliente por dejar vencer la renovación de un abono.

    Se modela como un intervalo (`inicio_at`/`fin_at`) en vez de un booleano en
    `User` porque el descuento de fidelidad pregunta si estuvo suspendido
    *durante* un mes dado, no solo si lo está ahora. `fin_at` NULL = vigente; el
    índice parcial garantiza una sola suspensión abierta por usuario.
    """

    __tablename__ = "suspensiones"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # Abono cuya renovación impaga disparó la suspensión (trazabilidad).
    grupo_id = db.Column(db.String(32), nullable=False)
    inicio_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    fin_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        db.Index(
            "uq_suspension_activa",
            "user_id",
            unique=True,
            postgresql_where=db.text("fin_at IS NULL"),
        ),
    )

    def __init__(self, user_id, grupo_id):
        self.user_id = user_id
        self.grupo_id = grupo_id

    def __repr__(self):
        return (
            f"<Suspension id={self.id} user={self.user_id} "
            f"inicio={self.inicio_at} fin={self.fin_at}>"
        )
