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


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
