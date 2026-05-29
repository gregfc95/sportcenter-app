from marshmallow import Schema, ValidationError, fields, validates
from sqlalchemy import select

from .. import db
from ..models.actividad import Actividad
from .messages import MSGS


PRECIO_MSGS = {**MSGS, "invalid": "El precio no es un numero valido"}


class ActividadSchema(Schema):
    nombre = fields.Str(required=True, error_messages=MSGS)
    precio = fields.Decimal(
        required=True,
        as_string=True,
        places=2,
        error_messages=PRECIO_MSGS,
    )

    id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True, format="iso")
    updated_at = fields.DateTime(dump_only=True, format="iso")

    @validates("nombre")
    def validate_nombre_unico(self, value):
        actividad_id = self.context.get("actividad_id")
        stmt = select(Actividad).where(Actividad.nombre == value)
        if actividad_id is not None:
            stmt = stmt.where(Actividad.id != actividad_id)
        if db.session.execute(stmt).scalars().first() is not None:
            raise ValidationError("El nombre ya esta en uso")

    @validates("precio")
    def validate_precio_positivo(self, value):
        if value <= 0:
            raise ValidationError("El precio no es un numero valido")
