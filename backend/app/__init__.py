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
    from .routes.user_routes import user_bp
    from .routes.reserva_routes import reserva_bp
    from .routes.clase_routes import clase_bp
    
    app.register_blueprint(main)
    app.register_blueprint(turno_bp)
    app.register_blueprint(actividad_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(reserva_bp)
    app.register_blueprint(clase_bp)
    from seed import register_commands
    register_commands(app)

    return app