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


class EstadoEspera(str, Enum):
    ESPERANDO = "esperando"   # en la cola, no consume cupo
    OFERTADO = "ofertado"     # con la oferta activa, retiene el lugar (consume cupo)
    VENCIDO = "vencido"       # dejó vencer la oferta; re-elegible tras una cancelación real


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

    # Lista de espera: NULL es una reserva normal. Ciclo de vida
    # esperando → ofertado → (pago → NULL | vencido → esperando de nuevo). Solo
    # NULL y `ofertado` consumen cupo; `esperando`/`vencido` esperan su turno.
    # `oferta_expira_at` marca el fin de la ventana de una oferta `ofertado`.
    estado_espera = db.Column(
        db.Enum(
            EstadoEspera,
            name="estado_espera",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=True,
        index=True,
    )
    oferta_expira_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Marca las reservas generadas automáticamente como renovación de un abono
    # pago del mes anterior: guarda el grupo_id del abono de origen. NULL en las
    # reservas creadas a mano. Es también la clave de idempotencia de la
    # generación (no se regenera un origen ya renovado, incluso si se declinó).
    renovacion_de_grupo_id = db.Column(db.String(32), nullable=True, index=True)

    # Asistencia por QR: el token identifica esta reserva-fecha dentro del
    # código (se genera recién cuando el cliente pide su QR, por eso nullable);
    # registrada_at/por asientan cuándo se escaneó y qué empleado/admin lo hizo.
    qr_token = db.Column(db.String(64), nullable=True, unique=True)
    asistencia_registrada_at = db.Column(db.DateTime(timezone=True), nullable=True)
    asistencia_registrada_por_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
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

    turno = db.relationship("Turno", back_populates="reservas")
    # `user` es el cliente dueño; `asistencia_registrada_por` el staff que
    # escaneó el QR. Como hay dos FKs a users, hay que indicar foreign_keys.
    user = db.relationship(
        "User", back_populates="reservas", foreign_keys=[user_id]
    )
    asistencia_registrada_por = db.relationship(
        "User", foreign_keys=[asistencia_registrada_por_id]
    )
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
        self,
        user_id,
        turno_id,
        fecha,
        tipo=ReservaTipo.EVENTUAL,
        grupo_id=None,
        estado_espera=None,
        renovacion_de_grupo_id=None,
    ):
        self.user_id = user_id
        self.turno_id = turno_id
        self.fecha = fecha
        self.tipo = tipo
        self.grupo_id = grupo_id
        self.estado_espera = estado_espera
        self.renovacion_de_grupo_id = renovacion_de_grupo_id

    @property
    def asistio(self) -> bool:
        return self.asistencia_registrada_at is not None

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
            "estado_espera": self.estado_espera.value if self.estado_espera else None,
            "oferta_expira_at": (
                self.oferta_expira_at.isoformat() if self.oferta_expira_at else None
            ),
        }
