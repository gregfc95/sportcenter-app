from app import db
from app.models.user import User

class UserRepository:

    def find_by_email(self, email: str) -> User | None:
        return User.query.filter_by(email=email).first()

    def find_by_dni(self, dni: str) -> User | None:
        return User.query.filter_by(dni=dni).first()

    def find_by_id(self, user_id: int) -> User | None:
        return User.query.filter_by(id=user_id).first()

    def save(self, user: User) -> User:
        db.session.add(user)
        db.session.commit()
        return user