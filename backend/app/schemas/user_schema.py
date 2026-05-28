from datetime import date
from marshmallow import Schema, fields, validates, ValidationError
import re

PASSWORD_RULE = "La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero"

MSGS = {
    "required": "Campo requerido faltante",
    "null": "Campo requerido faltante",
    "invalid": "Valor inválido",
}

EMAIL_MSGS = {**MSGS, "invalid": "El email ingresado no es valido"}


class UserUpdateProfileSchema(Schema):
    first_name = fields.Str(required=True, error_messages=MSGS)
    last_name = fields.Str(required=True, error_messages=MSGS)
    email = fields.Email(required=True, error_messages=EMAIL_MSGS)


class UserRegisterSchema(Schema):
    first_name = fields.Str(required=True, error_messages=MSGS)
    last_name = fields.Str(required=True, error_messages=MSGS)
    dni = fields.Str(required=True, error_messages=MSGS)
    email = fields.Email(required=True, error_messages=EMAIL_MSGS)
    phone = fields.Str(required=True, error_messages=MSGS)
    birth_date = fields.Date(required=True, format="%Y-%m-%d", error_messages=MSGS)
    password = fields.Str(required=True, load_only=True, error_messages=MSGS)

    @validates("dni")
    def validate_dni(self, value: str) -> None:
        if not value.isdigit():
            raise ValidationError("El DNI debe contener solo números")

    @validates("birth_date")
    def validate_birth_date(self, value: date) -> None:
        today = date.today()
        age = (
            today.year
            - value.year
            - ((today.month, today.day) < (value.month, value.day))
        )
        if age < 16:
            raise ValidationError("El usuario debe tener 16 años de edad")

    @validates("password")
    def validate_password(self, value: str) -> None:
        if not (8 <= len(value) <= 15):
            raise ValidationError(PASSWORD_RULE)
        if not re.search(r"[A-Z]", value):
            raise ValidationError(PASSWORD_RULE)
        if not re.search(r"[a-z]", value):
            raise ValidationError(PASSWORD_RULE)
        if not re.search(r"[0-9]", value):
            raise ValidationError(PASSWORD_RULE)
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValidationError(PASSWORD_RULE)


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
    email = fields.Email(required=True, error_messages=EMAIL_MSGS)
    password = fields.Str(required=True, load_only=True, error_messages=MSGS)