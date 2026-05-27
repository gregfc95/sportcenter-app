from app import create_app
from app import db
from app.models.user import User, UserRole
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    db.session.query(User).delete()

    users = [
        User(first_name="Cliente", last_name="Demo", dni="11111111", email="cliente@gmail.com", password_hash=generate_password_hash("Cliente1234!"), role=UserRole.CLIENT),
        User(first_name="Empleado", last_name="Demo", dni="22222222", email="empleado@gmail.com", password_hash=generate_password_hash("Empleado1234!"), role=UserRole.EMPLOYEE),
        User(first_name="Owner", last_name="Demo", dni="33333333", email="owner@gmail.com", password_hash=generate_password_hash("Owner1234!"), role=UserRole.OWNER),
    ]

    db.session.add_all(users)
    db.session.commit()
    print("Usuarios creados correctamente")