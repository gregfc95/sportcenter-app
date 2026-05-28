from marshmallow import Schema, fields

class ActividadSchema(Schema):
    # FIX: los campos deben coincidir exactamente con el modelo Actividad
    # El modelo tiene: actividad_id, nombre, costo_individual, costo_mensual
    # El front espera recibir 'id' y 'nombre' para armar el selector
    id = fields.Int(attribute="actividad_id", dump_only=True)
    nombre = fields.Str(dump_only=True)
    costo_individual = fields.Float(dump_only=True)
    costo_mensual = fields.Float(dump_only=True)