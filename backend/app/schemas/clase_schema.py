from datetime import date

from marshmallow import Schema, ValidationError, fields, validates

from .messages import MSGS

FECHA_MSGS = {**MSGS, "invalid": "La fecha no es valida"}


class ClaseSchema(Schema):
    turno_id = fields.Int(required=True, error_messages=MSGS)
    fecha = fields.Date(required=True, error_messages=FECHA_MSGS)

    id = fields.Int(dump_only=True)
    cupo_disponible = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True, format="iso")
    updated_at = fields.DateTime(dump_only=True, format="iso")

    @validates("fecha")
    def validate_fecha_no_pasada(self, value):
        if value < date.today():
            raise ValidationError("La fecha no puede ser en el pasado")

    @validates("fecha")
    def validate_fecha_no_pasada(self, value):
        if value < date.today():
            raise ValidationError("La fecha no puede ser en el pasado")