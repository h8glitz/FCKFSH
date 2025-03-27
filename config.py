# config.py
import os


class BaseConfig:
    BOT_TOKEN = "7155706487:AAEDysCMxBLxlztkxVmC8XA-3Y1fQVc5YTk"
    DATABASE_URI = "sqlite:///db/database.db"
    SSL_CERT_PATH = "cerf/certificate.crt"
    SSL_KEY_PATH = "cerf/private.key"


class ProductionConfig(BaseConfig):
    PUBLIC_URL = "https://fckfsh.ru"
    DEBUG = False
    DATABASE_URI = "postgresql://my_user:9044@localhost:5432/fckfshdb"


class DevelopmentConfig(BaseConfig):
    PUBLIC_URL = "http://localhost:5000"
    DEBUG = True
    # Используем SQLite для локальной разработки
    DATABASE_URI = "postgresql://my_user:9044@localhost:5432/fckfshdb"


def get_config():
    env = os.getenv('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig
    return DevelopmentConfig


Config = get_config()
