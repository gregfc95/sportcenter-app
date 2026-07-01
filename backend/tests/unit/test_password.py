"""Unit tests para el generador de contraseñas (app/utils/password.py)."""

import pytest

from app.schemas.user_schema import validate_password_strength
from app.utils.password import DIGITS, LOWER, SPECIAL, UPPER, generate_password


@pytest.mark.parametrize(
    "pedido, esperado",
    [
        (12, 12),
        (8, 8),
        (15, 15),
        (3, 8),    # se recorta al mínimo
        (20, 15),  # se recorta al máximo
    ],
)
def test_largo_se_clampa_entre_8_y_15(pedido, esperado):
    assert len(generate_password(pedido)) == esperado


@pytest.mark.parametrize("largo", [8, 10, 12, 15])
def test_incluye_cada_clase_de_caracter(largo):
    pw = generate_password(largo)
    assert any(c in LOWER for c in pw)
    assert any(c in UPPER for c in pw)
    assert any(c in DIGITS for c in pw)
    assert any(c in SPECIAL for c in pw)


@pytest.mark.parametrize("largo", [8, 12, 15])
def test_cumple_la_regla_de_fortaleza(largo):
    # La contraseña generada debe pasar el mismo validador que exige el registro.
    validate_password_strength(generate_password(largo))


def test_genera_valores_distintos():
    # Con 12 caracteres aleatorios la colisión es practicamente imposible.
    passwords = {generate_password(12) for _ in range(20)}
    assert len(passwords) > 1
