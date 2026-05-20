from marshmallow import Schema, fields, validate

class TurnoCreateSchema(Schema):
    # Validamos que el string sea EXACTAMENTE una de las opciones de la lista
    actividad = fields.Str(
        required=True, 
        validate=validate.OneOf(
            ['Fútbol', 'Básquet', 'Vóley', 'Pádel'], # <-- Cambiá esto por tus 4 actividades reales
            error="Actividad inválida. Debe ser Fútbol, Básquet, Vóley o Pádel."
        )
    )
    horario = fields.DateTime(required=True)
    cupo = fields.Int(required=True, validate=validate.Range(min=1, error="El cupo debe ser al menos 1."))
    # A la descripción sí le dejamos el Length porque es texto libre donde pueden escribir cualquier cosa
    descripcion = fields.Str(required=False, validate=validate.Length(max=255))