# config.py
import os


class BaseConfig:
    BOT_TOKEN = "7155706487:AAEDysCMxBLxlztkxVmC8XA-3Y1fQVc5YTk"
    DATABASE_URI = "sqlite:///db/database.db"
    SSL_CERT_PATH = "cerf/certificate.crt"
    SSL_KEY_PATH = "cerf/private.key"
    CLOUDFLARE_ENABLED = True
    CLOUDFLARE_DOMAIN = "fckfsh.ru"


class ProductionConfig(BaseConfig):
    PUBLIC_URL = "https://fckfsh.ru"
    DEBUG = False
    DATABASE_URI = "postgresql://my_user:9044@localhost:5432/fckfshdb"
    CLOUDFLARE_ENABLED = True
    CLOUDFLARE_DOMAIN = "fckfsh.ru"


class DevelopmentConfig(BaseConfig):
    PUBLIC_URL = "https://fckfsh.ru"  # Используем HTTPS даже в development
    DEBUG = True
    DATABASE_URI = "postgresql://my_user:9044@localhost:5432/fckfshdb"
    CLOUDFLARE_ENABLED = True
    CLOUDFLARE_DOMAIN = "fckfsh.ru"


def get_config():
    # Принудительно используем production конфигурацию
    return ProductionConfig


Config = get_config()
