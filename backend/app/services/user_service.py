from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from .. import db
from ..models.user import User, UserRole


class UserService:

    def listar_usuarios(self, role: UserRole | None = None) -> list[User]:
        stmt = select(User)
        if role is not None:
            stmt = stmt.where(User.role == role)
        return db.session.execute(stmt).scalars().all()

    def register_user(self, data: dict, role: UserRole | None = None) -> User:
        if self._find_by_email(data["email"]) is not None:
            raise ValueError("El email ya se encuentra registrado")
        if self._find_by_dni(data["dni"]) is not None:
            raise ValueError("El DNI ya se encuentra registrado")

        user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            dni=data["dni"],
            email=data["email"],
            phone=data.get("phone"),
            birth_date=data.get("birth_date"),
            password_hash=generate_password_hash(data["password"]),
        )
        if role is not None:
            user.role = role
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("El email o DNI ya se encuentra registrado")
        return user

    def login_user(self, email: str, password: str) -> User:
        user = self._find_by_email(email)
        if user is None or not check_password_hash(user.password_hash, password):
            raise ValueError("Email y/o contraseña inválidos")
        return user

    def update_profile(self, user_id: int, data: dict) -> User:
        user = db.session.get(User, user_id)
        if user is None:
            raise ValueError("Usuario no encontrado")

        if data["email"] != user.email:
            if self._find_by_email(data["email"]) is not None:
                raise ValueError("El email ya se encuentra registrado")

        user.first_name = data["first_name"]
        user.last_name = data["last_name"]
        user.email = data["email"]

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("El email ya se encuentra registrado")
        return user

    # --- Queries ---

    def _find_by_email(self, email: str) -> User | None:
        return db.session.execute(
            select(User).where(User.email == email)
        ).scalars().first()

    def _find_by_dni(self, dni: str) -> User | None:
        return db.session.execute(
            select(User).where(User.dni == dni)
        ).scalars().first()
