from werkzeug.security import generate_password_hash, check_password_hash
from app.models.user import User
from app.repositories.user_repository import UserRepository

class UserService:

    def __init__(self) -> None:
        self.user_repository = UserRepository()

    def register_user(self, data: dict) -> User:
        if self.user_repository.find_by_email(data["email"]):
            raise ValueError("El email ya se encuentra registrado")

        if self.user_repository.find_by_dni(data["dni"]):
            raise ValueError("El DNI ya se encuentra registrado")

        user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            dni=data["dni"],
            email=data["email"],
            phone=data.get("phone"),
            birth_date=data.get("birth_date"),
            password_hash=generate_password_hash(data["password"])
        )

        return self.user_repository.save(user)

    def login_user(self, email: str, password: str) -> User:
        user = self.user_repository.find_by_email(email)
        if not user or not check_password_hash(user.password_hash, password):
            raise ValueError("Email y/o contraseña inválidos")
        return user
    def update_profile(self, user_id: int, data: dict) -> User:
        user = self.user_repository.find_by_id(user_id)
        if not user:
            raise ValueError("Usuario no encontrado")

        if data["email"] != user.email:
            if self.user_repository.find_by_email(data["email"]):
                raise ValueError("El email ya se encuentra registrado")

        user.first_name = data["first_name"]
        user.last_name = data["last_name"]
        user.email = data["email"]

        return self.user_repository.save(user)