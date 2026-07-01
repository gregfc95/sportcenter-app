"""Unit tests para los helpers de validación de usuario (app/schemas/user_schema.py)."""

from datetime import date

import pytest
from marshmallow import ValidationError

from app.schemas.user_schema import calculate_age, validate_password_strength


class TestCalculateAge:
    def test_cumpleanios_hoy(self):
        assert calculate_age(date(2000, 6, 15), today=date(2020, 6, 15)) == 20

    def test_dia_antes_del_cumpleanios(self):
        assert calculate_age(date(2000, 6, 15), today=date(2020, 6, 14)) == 19

    def test_dia_despues_del_cumpleanios(self):
        assert calculate_age(date(2000, 6, 15), today=date(2020, 6, 16)) == 20

    def test_bisiesto_antes_del_29(self):
        # Nacido el 29-feb; al 28-feb todavía no cumplió.
        assert calculate_age(date(2000, 2, 29), today=date(2021, 2, 28)) == 20

    def test_bisiesto_el_1_de_marzo(self):
        assert calculate_age(date(2000, 2, 29), today=date(2021, 3, 1)) == 21

    def test_today_por_defecto_no_falla(self):
        assert calculate_age(date(2000, 1, 1)) >= 0


class TestValidatePasswordStrength:
    def test_password_valida_no_lanza(self):
        validate_password_strength("Passw0rd!")

    @pytest.mark.parametrize("largo_ok", ["Aa1!aaaa", "Aa1!aaaaaaaaaa"])  # 8 y 14
    def test_largos_validos(self, largo_ok):
        validate_password_strength(largo_ok)

    @pytest.mark.parametrize(
        "invalida",
        [
            "Aa1!xyz",          # 7 chars: demasiado corta
            "Aa1!aaaaaaaaaaaa", # 16 chars: demasiado larga
            "passw0rd!",        # sin mayúscula
            "PASSW0RD!",        # sin minúscula
            "Password!",        # sin dígito
            "Passw0rd1",        # sin caracter especial
        ],
    )
    def test_passwords_invalidas_lanzan(self, invalida):
        with pytest.raises(ValidationError):
            validate_password_strength(invalida)
