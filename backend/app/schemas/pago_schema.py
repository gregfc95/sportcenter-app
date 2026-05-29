from marshmallow import Schema, fields


class PagoSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    reserva_id = fields.Int(dump_only=True)
    monto = fields.Decimal(as_string=True, places=2, dump_only=True)
    estado = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True, format="iso")
    updated_at = fields.DateTime(dump_only=True, format="iso")
