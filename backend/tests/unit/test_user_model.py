"""Unit tests para la normalización de email (app/models/user.py)."""

import pytest

from app.models.user import normalize_email


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("  Foo@Bar.COM ", "foo@bar.com"),
        ("ALREADY@LOW.COM", "already@low.com"),
        ("ya@normal.com", "ya@normal.com"),
        ("\tspacey@mail.com\n", "spacey@mail.com"),
    ],
)
def test_normaliza_minusculas_y_espacios(entrada, esperado):
    assert normalize_email(entrada) == esperado


def test_none_se_devuelve_tal_cual():
    assert normalize_email(None) is None
