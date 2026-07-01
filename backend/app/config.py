import os


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev")
    # Frontend base URL used to build Mercado Pago back_urls (where the user is
    # redirected after paying). Vite dev server defaults to :5173.
    APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Mailtrap (Email API via the python SDK).
    MAILTRAP_TOKEN = os.getenv("MAILTRIP_TOKEN")
    MAILTRAP_SANDBOX = os.getenv("MAILTRAP_SANDBOX", "true").lower() == "true"
    _inbox_id = os.getenv("MAILTRAP_INBOX_ID")
    MAILTRAP_INBOX_ID = int(_inbox_id) if _inbox_id else None
    MAIL_FROM = os.getenv("MAIL_FROM", "no-reply@sportify.app")
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Sportify")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    # Base de datos de tests: PostgreSQL aparte para no tocar datos de dev y
    # para reproducir los índices únicos parciales (postgresql_where) tal cual
    # producción. Por defecto, el mismo servidor de dev con sufijo `_test`; en
    # CI se inyecta TEST_DATABASE_URL apuntando al servicio de Postgres.
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL") or (
        f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}_test"
    )
    # Nunca mandar mail de verdad en tests.
    MAILTRAP_SANDBOX = True


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
