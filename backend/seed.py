from app import db


def register_commands(app):
    """Registra todos los comandos CLI custom de la app."""

    @app.cli.command("seed-db")
    def seed_db():
        """Carga los datos iniciales necesarios para que la app funcione."""
        from datetime import date, time
        from decimal import Decimal

        from werkzeug.security import generate_password_hash

        from app.models import Actividad, Turno, User
        from app.models.turno import DiaSemana
        from app.models.user import UserRole

        # --- Limpieza (respetando las FKs: turnos -> actividades / users) ---
        db.session.query(Turno).delete()
        db.session.query(Actividad).delete()
        db.session.query(User).delete()
        db.session.commit()

        # --- Actividades ---
        deportes = [
            {"nombre": "Fútbol", "precio": Decimal("1500.00")},
            {"nombre": "Vóley", "precio": Decimal("1000.00")},
        ]

        actividades = {}
        for d in deportes:
            actividad = Actividad(**d)
            db.session.add(actividad)
            actividades[d["nombre"]] = actividad

        db.session.commit()
        print(f"✅ {len(actividades)} actividad(es) cargada(s).")

        # --- Turnos (algunos por actividad) ---
        turnos_data = [
            ("Fútbol", DiaSemana.LUNES, time(18, 0), 10),
            ("Fútbol", DiaSemana.MIERCOLES, time(20, 0), 10),
            ("Vóley", DiaSemana.SABADO, time(10, 0), 12),
        ]

        turnos = []
        for nombre, dia, hora, cupo in turnos_data:
            turno = Turno(
                actividad_id=actividades[nombre].id,
                dia_semana=dia,
                hora=hora,
                cupo=cupo,
            )
            db.session.add(turno)
            turnos.append(turno)

        db.session.commit()
        print(f"✅ {len(turnos)} turno(s) cargado(s).")

        # --- Usuarios ---
        users = [
            User(
                first_name="Cliente",
                last_name="Demo",
                dni="11111111",
                email="cliente@gmail.com",
                phone="1122334455",
                birth_date=date(1995, 6, 15),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            User(
                first_name="Empleado",
                last_name="Demo",
                dni="22222222",
                email="empleado@gmail.com",
                phone="1133445566",
                birth_date=date(1990, 3, 22),
                password_hash=generate_password_hash("Empleado1234!"),
                role=UserRole.EMPLOYEE,
            ),
            User(
                first_name="Admin",
                last_name="Demo",
                dni="33333333",
                email="admin@gmail.com",
                phone="1144556677",
                birth_date=date(1985, 11, 5),
                password_hash=generate_password_hash("Admin1234!"),
                role=UserRole.ADMIN,
            ),
        ]

        db.session.add_all(users)
        db.session.commit()
        print(f"✅ {len(users)} usuario(s) creado(s).")

        print("🌱 Seed completado.")
