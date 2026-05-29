from marshmallow import Schema, ValidationError, fields, validates

from ..models.turno import DiaSemana
from .messages import MSGS

DIA_SEMANA_MSGS = {**MSGS, "invalid": "El día de la semana no es valido"}
HORA_MSGS = {**MSGS, "invalid": "La hora ingresada no es valida"}
CUPO_MSGS = {**MSGS, "invalid": "El cupo debe ser un numero valido"}


class TurnoSchema(Schema):
    dia_semana = fields.Str(required=True, error_messages=DIA_SEMANA_MSGS)
    hora = fields.Time(required=True, error_messages=HORA_MSGS)
    cupo = fields.Int(required=True, error_messages=CUPO_MSGS)

    id = fields.Int(dump_only=True)
    created_at = fields.DateTime(dump_only=True, format="iso")
    updated_at = fields.DateTime(dump_only=True, format="iso")

    @validates("dia_semana")
    def validate_dia_semana(self, value):
        valid = [d.value for d in DiaSemana]
        if value not in valid:
            raise ValidationError("El día debe ser uno de: " + ", ".join(valid))

    @validates("cupo")
    def validate_cupo_positivo(self, value):
        if value < 1:
            raise ValidationError("El cupo debe ser mayor a cero")
