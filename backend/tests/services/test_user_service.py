"""Tests de `UserService` contra la base de datos de tests."""

from datetime import date

import pytest
from werkzeug.security import check_password_hash

from app.models.user import UserRole
from app.services.user_service import UserService

us = UserService()


def _data(**over):
    base = dict(
        first_name="Juan",
        last_name="Perez",
        dni="30111222",
        email="juan@test.com",
        phone="1100200300",
        birth_date=date(1990, 1, 1),
        password="Passw0rd!",
    )
    base.update(over)
    return base


class TestRegister:
    def test_ok_hashea_y_normaliza(self, db_session):
        user = us.register_user(_data(email="JUAN@Test.com"))
        assert user.id is not None
        assert user.email == "juan@test.com"          # normalizado
        assert user.password_hash != "Passw0rd!"        # hasheado
        assert check_password_hash(user.password_hash, "Passw0rd!")
        assert user.role == UserRole.CLIENT

    def test_rol_explicito(self, db_session):
        user = us.register_user(_data(), role=UserRole.EMPLOYEE)
        assert user.role == UserRole.EMPLOYEE

    def test_email_duplicado_case_insensitive(self, db_session):
        us.register_user(_data())
        with pytest.raises(ValueError, match="email"):
            us.register_user(_data(email="JUAN@TEST.COM", dni="40000000"))

    def test_dni_duplicado(self, db_session):
        us.register_user(_data())
        with pytest.raises(ValueError, match="DNI"):
            us.register_user(_data(email="otro@test.com"))


class TestLogin:
    def test_ok(self, db_session):
        us.register_user(_data())
        assert us.login_user("juan@test.com", "Passw0rd!").email == "juan@test.com"

    def test_email_case_insensitive(self, db_session):
        us.register_user(_data())
        assert us.login_user("JUAN@TEST.COM", "Passw0rd!").id is not None

    def test_password_incorrecta(self, db_session):
        us.register_user(_data())
        with pytest.raises(ValueError):
            us.login_user("juan@test.com", "incorrecta")

    def test_email_inexistente(self, db_session):
        with pytest.raises(ValueError):
            us.login_user("nadie@test.com", "Passw0rd!")


class TestUpdateProfile:
    def test_cambia_datos(self, db_session):
        user = us.register_user(_data())
        actualizado = us.update_profile(
            user.id,
            {"first_name": "Juana", "last_name": "Gomez", "email": "juana@test.com"},
        )
        assert actualizado.first_name == "Juana"
        assert actualizado.email == "juana@test.com"

    def test_email_duplicado_de_otro_usuario(self, db_session):
        us.register_user(_data())
        otro = us.register_user(_data(email="dos@test.com", dni="40000000"))
        with pytest.raises(ValueError, match="email"):
            us.update_profile(
                otro.id,
                {"first_name": "X", "last_name": "Y", "email": "juan@test.com"},
            )

    def test_cambia_password_con_actual_correcta(self, db_session):
        user = us.register_user(_data())
        us.update_profile(
            user.id,
            {"first_name": "Juan", "last_name": "Perez", "email": "juan@test.com"},
            current_password="Passw0rd!",
            new_password="Nueva1234!",
        )
        assert check_password_hash(user.password_hash, "Nueva1234!")

    def test_password_actual_incorrecta_falla(self, db_session):
        user = us.register_user(_data())
        with pytest.raises(ValueError, match="actual"):
            us.update_profile(
                user.id,
                {"first_name": "Juan", "last_name": "Perez", "email": "juan@test.com"},
                current_password="incorrecta",
                new_password="Nueva1234!",
            )
