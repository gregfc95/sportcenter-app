from datetime import date

from marshmallow import Schema, ValidationError, fields, validates

from ..models.reserva import ReservaTipo
from .messages import MSGS


FECHA_MSGS = {**MSGS, "invalid": "La fecha no es valida"}
TIPO_MSGS = {**MSGS, "invalid": "El tipo de reserva no es valido"}


class ReservaSchema(Schema):
    fecha = fields.Date(required=True, error_messages=FECHA_MSGS)
    tipo = fields.Str(required=True, error_messages=TIPO_MSGS)

    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    turno_id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True, format="iso")
    updated_at = fields.DateTime(dump_only=True, format="iso")

    @validates("fecha")
    def validate_fecha_no_pasada(self, value):
        if value < date.today():
            raise ValidationError("La fecha no puede ser en el pasado")

    @validates("tipo")
    def validate_tipo(self, value):
        valid = [t.value for t in ReservaTipo]
        if value not in valid:
            raise ValidationError("El tipo debe ser uno de: " + ", ".join(valid))
