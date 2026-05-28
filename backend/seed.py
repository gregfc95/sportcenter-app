from app import db

def register_commands(app):
    """Registra todos los comandos CLI custom de la app."""

    @app.cli.command("seed-db")
    def seed_db():
        """Carga los datos iniciales necesarios para que la app funcione."""
        from app.models import Actividad
        from app.models.user import User, UserRole
        from werkzeug.security import generate_password_hash

        deportes = [
            {"nombre": "Fútbol",   "costo_individual": 1500.0, "costo_mensual": 12000.0},
            {"nombre": "Pádel",    "costo_individual": 2000.0, "costo_mensual": 15000.0},
            {"nombre": "Básquet",  "costo_individual": 1200.0, "costo_mensual":  9500.0},
            {"nombre": "Vóley",    "costo_individual": 1000.0, "costo_mensual":  8000.0},
        ]

        agregadas = 0
        for d in deportes:
            if not Actividad.query.filter_by(nombre=d["nombre"]).first():
                db.session.add(Actividad(**d))
                agregadas += 1

        db.session.commit()

        if agregadas:
            print(f"✅ {agregadas} actividad(es) cargada(s).")
        else:
            print("ℹ️  Las actividades ya estaban cargadas, no se hizo nada.")

        db.session.query(User).delete()

        users = [
            User(first_name="Cliente", last_name="Demo", dni="11111111", email="cliente@gmail.com", password_hash=generate_password_hash("Cliente1234!"), role=UserRole.CLIENT),
            User(first_name="Empleado", last_name="Demo", dni="22222222", email="empleado@gmail.com", password_hash=generate_password_hash("Empleado1234!"), role=UserRole.EMPLOYEE),
            User(first_name="Admin", last_name="Demo", dni="33333333", email="admin@gmail.com", password_hash=generate_password_hash("Admin1234!"), role=UserRole.ADMIN),
        ]

        db.session.add_all(users)
        db.session.commit()
        print("✅ Usuarios creados correctamente.")