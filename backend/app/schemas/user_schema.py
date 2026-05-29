from datetime import date
from marshmallow import Schema, fields, validates, ValidationError
import re

from .messages import MSGS

PASSWORD_RULE = "La contraseña debe tener: 8 - 15 caracteres, 1 mayuscula, 1 minuscula, 1 caracter especial, 1 numero"

EMAIL_MSGS = {**MSGS, "invalid": "El email ingresado no es valido"}


def calculate_age(birth_date: date, today: date | None = None) -> int:
    today = today or date.today()
    return (
        today.year
        - birth_date.year
        - ((today.month, today.day) < (birth_date.month, birth_date.day))
    )


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
        if calculate_age(value) < 16:
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


class EmployeeRegisterSchema(UserRegisterSchema):
    @validates("birth_date")
    def validate_birth_date(self, value: date) -> None:
        if calculate_age(value) < 18:
            raise ValidationError("El empleado debe ser mayor de edad")


class UserResponseSchema(Schema):
    id = fields.Int()
    first_name = fields.Str()
    last_name = fields.Str()
    dni = fields.Str()
    email = fields.Str()
    phone = fields.Str()
    role = fields.Method("get_role")

    def get_role(self, obj) -> str:
        return obj.role.value


class UserLoginSchema(Schema):
    email = fields.Email(required=True, error_messages=EMAIL_MSGS)
    password = fields.Str(required=True, load_only=True, error_messages=MSGS)