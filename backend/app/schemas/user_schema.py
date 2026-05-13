from marshmallow import Schema, fields, validate

class UserRegisterSchema(Schema):
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    dni = fields.Str(required=True, validate=validate.Length(min=7, max=20))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8), load_only=True)

class UserResponseSchema(Schema):
    id = fields.Int()
    first_name = fields.Str()
    last_name = fields.Str()
    dni = fields.Str()
    email = fields.Str()