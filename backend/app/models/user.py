from datetime import datetime, timezone
from enum import Enum
from .. import db
from .limits import (
    FIRST_NAME_MAX,
    LAST_NAME_MAX,
    DNI_MAX,
    EMAIL_MAX,
    PHONE_MAX,
    PASSWORD_HASH_MAX,
)
from .soft_delete import SoftDeleteMixin


class UserRole(str, Enum):
    CLIENT = "client"
    EMPLOYEE = "employee"
    ADMIN = "admin"


# Necesitamos DNI y EMAIL unique parcial para si el permitir que usuarios eliminados puedan volver a registrarse con el mismo DNI


# Debe implementar el softdelete
class User(SoftDeleteMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(FIRST_NAME_MAX), nullable=False)
    last_name = db.Column(db.String(LAST_NAME_MAX), nullable=False)
    dni = db.Column(db.String(DNI_MAX), unique=True, nullable=False)
    email = db.Column(db.String(EMAIL_MAX), unique=True, nullable=False)
    password_hash = db.Column(db.String(PASSWORD_HASH_MAX), nullable=False)
    phone = db.Column(db.String(PHONE_MAX), nullable=True)
    birth_date = db.Column(db.Date, nullable=True)
    role = db.Column(
        db.Enum(UserRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.CLIENT,
    )
    is_active = db.Column(db.Boolean, default=True, nullable=False)
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

    reservas = db.relationship("Reserva", back_populates="user", lazy=True)
    pagos = db.relationship(
        "Pago",
        back_populates="user",
        lazy=True,
        passive_deletes="all",
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"
