from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from .config import config_map
import os

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)

    env = os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_map[env])

    db.init_app(app)
    migrate.init_app(app, db)

    from .routes import main
    from .routes.turno_routes import turno_bp
    from .routes.actividad_routes import actividad_bp

    app.register_blueprint(main)
    app.register_blueprint(turno_bp)
    app.register_blueprint(actividad_bp)

    # --- INICIO DE CARGA AUTOMÁTICA ---
    with app.app_context():
        from .models import Actividad

        db.create_all()  # Asegura que las tablas estén creadas antes de insertar datos
        
        deportes = [
            {"nombre": "Fútbol", "costo_individual": 1500.0, "costo_mensual": 12000.0},
            {"nombre": "Pádel", "costo_individual": 2000.0, "costo_mensual": 15000.0},
            {"nombre": "Básquet", "costo_individual": 1200.0, "costo_mensual": 9500.0},
            {"nombre": "Vóley", "costo_individual": 1000.0, "costo_mensual": 8000.0}
        ]
        
        for d in deportes:
            if not Actividad.query.filter_by(nombre=d["nombre"]).first():
                nueva_act = Actividad(
                    nombre=d["nombre"], 
                    costo_individual=d["costo_individual"], 
                    costo_mensual=d["costo_mensual"]
                )
                db.session.add(nueva_act)
        db.session.commit()
    # --- FIN DE CARGA AUTOMÁTICA ---

    return app
