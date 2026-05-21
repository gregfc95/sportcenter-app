from marshmallow import Schema, fields, validate, validates, ValidationError
import re

class UserRegisterSchema(Schema):
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    dni = fields.Str(required=True, validate=validate.Length(min=7, max=20))
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)

    @validates("dni")
    def validate_dni(self, value: str) -> None:
        if not value.isdigit():
            raise ValidationError("El DNI debe contener solo números.")

    @validates("password")
    def validate_password(self, value: str) -> None:
        if len(value) < 8:
            raise ValidationError("La contraseña debe tener al menos 8 caracteres.")
        if not re.search(r"[A-Z]", value):
            raise ValidationError("La contraseña debe tener al menos una mayúscula.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValidationError("La contraseña debe tener al menos un carácter especial.")

class UserResponseSchema(Schema):
    id = fields.Int()
    first_name = fields.Str()
    last_name = fields.Str()
    dni = fields.Str()
    email = fields.Str()

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)