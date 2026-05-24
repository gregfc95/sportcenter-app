from marshmallow import Schema, fields, validate, ValidationError, validates
from datetime import datetime


class TurnoCreateSchema(Schema):
    # Validamos que el string sea EXACTAMENTE una de las opciones de la lista
    actividad_id = fields.Int(required=True)
    horario = fields.DateTime(required=True)
    cupo = fields.Int(required=True, validate=validate.Range(min=1, error="El cupo debe ser al menos 1."))
    # A la descripción sí le dejamos el Length porque es texto libre donde pueden escribir cualquier cosa
    descripcion = fields.Str(required=False, validate=validate.Length(max=255))

    @validates("horario")
    def validate_horario(self, value):
        if value < datetime.now():
            raise ValidationError("El horario no puede ser en el pasado.")