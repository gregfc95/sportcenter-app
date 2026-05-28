from . import db


def register_commands(app):
    """Registra todos los comandos CLI custom de la app."""

    @app.cli.command("seed-db")
    def seed_db():
        """Carga los datos iniciales necesarios para que la app funcione."""
        from .models import Actividad

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