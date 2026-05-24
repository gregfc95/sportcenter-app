from marshmallow import Schema, fields, validate, ValidationError, validates

DIAS_VALIDOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

class TurnoCreateSchema(Schema):
    actividad_id = fields.Int(required=True)
    dia_semana = fields.Str(required=True, validate=validate.OneOf(
        DIAS_VALIDOS,
        error="El día debe ser uno de: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo."
    ))
    hora = fields.Time(required=True)   # Marshmallow espera formato "HH:MM:SS" o "HH:MM"
    cupo = fields.Int(required=True, validate=validate.Range(min=1, error="El cupo debe ser al menos 1."))
    descripcion = fields.Str(required=False, validate=validate.Length(max=255))

    # dump fields (respuesta al cliente)
    id = fields.Int(dump_only=True)
    actividad = fields.Str(dump_only=True)
    disponibles = fields.Int(dump_only=True)