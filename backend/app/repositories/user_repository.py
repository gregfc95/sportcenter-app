from .. import db
from ..models.user import User

class UserRepository:

    def find_by_email(self, email):
        return User.query.filter_by(email=email).first()

    def find_by_dni(self, dni):
        return User.query.filter_by(dni=dni).first()

    def save(self, user):
        db.session.add(user)
        db.session.commit()
        return user