from werkzeug.security import generate_password_hash
from ..models.user import User
from ..repositories.user_repository import UserRepository

class UserService:

    def __init__(self):
        self.user_repository = UserRepository()

    def register_user(self, data):
        if self.user_repository.find_by_email(data["email"]):
            raise ValueError("El email ya está registrado")

        user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            dni=data["dni"],
            email=data["email"],
            password_hash=generate_password_hash(data["password"])
        )

        return self.user_repository.save(user)