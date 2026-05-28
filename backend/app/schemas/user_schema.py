from datetime import date
from marshmallow import Schema, fields, validate, validates, ValidationError
import re

class UserRegisterSchema(Schema):
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    dni = fields.Str(required=True, validate=validate.Length(min=7, max=20))
    email = fields.Email(required=True, error_messages={"validator_failed": "El email ingresado no es valido"})
    phone = fields.Str(load_default=None)
    birth_date = fields.Date(required=True, format="%Y-%m-%d")
    password = fields.Str(required=True, load_only=True)

    @validates("dni")
    def validate_dni(self, value: str) -> None:
        if not value.isdigit():
            raise ValidationError("El DNI debe contener solo números.")

    @validates("birth_date")
    def validate_birth_date(self, value: date) -> None:
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 16:
            raise ValidationError("El usuario debe tener 16 años de edad")

    @validates("password")
    def validate_password(self, value: str) -> None:
        if not (8 <= len(value) <= 15):
            raise ValidationError("La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero")
        if not re.search(r"[A-Z]", value):
            raise ValidationError("La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero")
        if not re.search(r"[a-z]", value):
            raise ValidationError("La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero")
        if not re.search(r"[0-9]", value):
            raise ValidationError("La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValidationError("La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero")

class UserResponseSchema(Schema):
    id = fields.Int()
    first_name = fields.Str()
    last_name = fields.Str()
    dni = fields.Str()
    email = fields.Str()
    role = fields.Method("get_role")

    def get_role(self, obj) -> str:
        return obj.role.value

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)