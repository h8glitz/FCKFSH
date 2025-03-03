import os
import threading
import subprocess
import time
import requests
import logging

from flask import Flask, request, redirect, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config
from fck_app.bot import run_bot
from routes import main_bp
from db.models import db

# =============== Импорт Telethon и asyncio ===================
import asyncio
from telethon import TelegramClient, events
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
# ===================================================================

# Настройки Telethon
API_ID = 21435721
API_HASH = "b77bc7d9879b30b16078564eaa14bf05"
PHONE_NUMBER = "+15812713524"
SESSION_NAME = "my_session"  # Файл my_session.session будет создан в текущей папке
CHANNELS = [
    "https://t.me/fashionab1ee",
    "https://t.me/testfcknew",
    # ...
]

# Путь к cloudflared
CLOUDFLARED_PATH = r"C:\Program Files\Cloudflare\cloudflared.exe"
TUNNEL_DOMAIN = "fckfsh.ru"

FLASK_READY = threading.Event()
TUNNEL_READY = threading.Event()

def configure_logging():
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("app.log")
        ]
    )
    print("[LOGGING] Расширенное логирование настроено")

def create_app(config_class=Config):
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_class)
    app.config["SQLALCHEMY_DATABASE_URI"] = config_class.DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=2, x_proto=2, x_host=1, x_prefix=1, x_port=1)

    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()

    @app.before_request
    def before_request():
        if not request.is_secure and request.headers.get("X-Forwarded-Proto", "http") != "https":
            if not request.host.startswith(("127.0.0.1", "localhost")):
                url = request.url.replace("http://", "https://", 1)
                return redirect(url, code=301)

    @app.route("/health")
    def health_check():
        return {"status": "healthy"}, 200

    return app

def wait_for_server(timeout=30):
    print("[SERVER] Ожидание запуска Flask-сервера...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get("http://127.0.0.1:5000/health")
            if response.status_code == 200:
                print("[SERVER] Flask сервер готов к работе")
                return True
        except requests.exceptions.ConnectionError:
            time.sleep(1)
    print("[SERVER] Таймаут ожидания Flask сервера")
    return False

def check_tunnel_health(timeout=30):
    print("[CLOUDFLARE] Проверка доступности туннеля...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"https://{TUNNEL_DOMAIN}/health")
            if response.status_code == 200:
                print("[CLOUDFLARE] Туннель работает корректно")
                return True
        except requests.exceptions.RequestException:
            time.sleep(1)
    print("[CLOUDFLARE] Таймаут ожидания туннеля")
    return False

def start_cloudflare_tunnel():
    try:
        if not FLASK_READY.wait(timeout=30):
            raise Exception("Flask сервер не готов")
        print("[CLOUDFLARE] Запуск Cloudflare Tunnel...")
        tunnel_process = subprocess.Popen(
            [
                CLOUDFLARED_PATH,
                "tunnel",
                "--config",
                "config.yml",
                "run"
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        time.sleep(5)
        os.environ["PUBLIC_URL"] = f"https://{TUNNEL_DOMAIN}"
        if check_tunnel_health():
            TUNNEL_READY.set()
            print(f"[CLOUDFLARE] 🟢 Туннель работает: {os.environ['PUBLIC_URL']}")
        else:
            raise Exception("Туннель не отвечает")

        def log_output(process):
            while True:
                line = process.stdout.readline()
                if not line:
                    break
                print("[CLOUDFLARE LOG]", line.strip())

        def log_errors(process):
            while True:
                line = process.stderr.readline()
                if not line:
                    break
                print("[CLOUDFLARE ERROR]", line.strip())

        threading.Thread(target=log_output, args=(tunnel_process,), daemon=True).start()
        threading.Thread(target=log_errors, args=(tunnel_process,), daemon=True).start()

    except Exception as e:
        print(f"[CLOUDFLARE] 🔴 Ошибка запуска туннеля: {e}")
        raise

# ============== ALBUM ОБРАБОТКА ===================
pending_albums = {}   # Ключ: grouped_id, значение: список сообщений
ALBUM_TIMEOUT = 2     # Задержка в секундах для сбора частей альбома

async def telegram_scraper(client, flask_app):
    """
    Телеграм-скрейпер, который слушает новые сообщения в каналах.
    Если сообщение имеет grouped_id (альбом), объединяет все части в один пост.
    """
    from db.models import News  # Импортируем здесь, чтобы избежать циклических импортов

    @client.on(events.NewMessage(chats=CHANNELS))
    async def new_message_listener(event):
        message = event.message
        # Если сообщение принадлежит альбому
        if message.grouped_id:
            gid = message.grouped_id
            if gid not in pending_albums:
                pending_albums[gid] = []
                # Запускаем обработчик альбома через ALBUM_TIMEOUT секунд
                asyncio.create_task(process_album(gid, client, flask_app))
            pending_albums[gid].append(message)
            return
        else:
            # Одиночное сообщение – стандартная обработка
            await process_single_message(message, client, flask_app)

    async def process_single_message(message, client, flask_app):
        text = message.message or ""
        image_url = None
        video_url = None

        if message.media:
            if isinstance(message.media, MessageMediaPhoto):
                file_path = await client.download_media(message.media, file="static/news_photos/")
                image_url = file_path
            elif isinstance(message.media, MessageMediaDocument):
                if message.file and message.file.mime_type and message.file.mime_type.startswith("video"):
                    file_path = await client.download_media(message.media, file="static/news_videos/")
                    video_url = file_path

        title = text[:50] if len(text) > 50 else text
        channel = await message.get_chat()

        with flask_app.app_context():
            news_item = News(
                channel_id=str(channel.id),
                telegram_message_id=message.id,
                title=title,
                text=text,
                image_url=image_url,
                video_url=video_url,
                is_approved=False
            )
            db.session.add(news_item)
            db.session.commit()
            logging.info(f"[TELEGRAM] Одиночная новость из канала {channel.title} сохранена, ID={news_item.id}")

    async def process_album(grouped_id, client, flask_app):
        # Ждем ALBUM_TIMEOUT секунд для сбора всех частей альбома
        await asyncio.sleep(ALBUM_TIMEOUT)
        album_messages = pending_albums.pop(grouped_id, [])
        if not album_messages:
            return

        media_urls = []
        text = album_messages[0].message or ""
        title = text[:50] if len(text) > 50 else text
        channel = await album_messages[0].get_chat()

        for msg in album_messages:
            if msg.media:
                if isinstance(msg.media, MessageMediaPhoto):
                    file_path = await client.download_media(msg.media, file="static/news_photos/")
                    media_urls.append(file_path)
                elif isinstance(msg.media, MessageMediaDocument):
                    if msg.file and msg.file.mime_type and msg.file.mime_type.startswith("video"):
                        file_path = await client.download_media(msg.media, file="static/news_videos/")
                        media_urls.append(file_path)
        # Сохраняем одну новость для всего альбома.
        # Вместо сохранения JSON-строки, сохраняем список URL как строку, разделённую запятыми.
        media_str = ",".join(media_urls)
        with flask_app.app_context():
            news_item = News(
                channel_id=str(channel.id),
                telegram_message_id=album_messages[0].id,  # Можно сохранить grouped_id вместо id первого сообщения
                title=title,
                text=text,
                image_url=media_str,  # Здесь теперь строка с запятыми, например: "url1,url2"
                video_url=None,
                is_approved=False
            )
            db.session.add(news_item)
            db.session.commit()
            logging.info(f"[TELEGRAM] Альбом из {len(album_messages)} сообщений сохранён, ID={news_item.id}, media={media_urls}")

    logging.info("[TELETHON] Telegram клиент запущен, ждём новые сообщения...")
    await client.run_until_disconnected()

def start_telegram_scraper(flask_app):
    """
    Запускает Telethon-клиента в отдельном потоке (daemon=True).
    """
    async def runner():
        client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        async with client:
            await client.start(phone=PHONE_NUMBER)
            logging.info("[TELETHON] Клиент авторизован")
            await telegram_scraper(client, flask_app)
    def thread_target():
        asyncio.run(runner())
    thread = threading.Thread(target=thread_target, daemon=True)
    thread.start()

# =====================================================================

def run_flask(app):
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )

if __name__ == "__main__":
    configure_logging()
    app = create_app()


    print(f"[SERVER] Локально:  http://127.0.0.1:5000")
    print(f"[SERVER] Извне:    https://{TUNNEL_DOMAIN}")
    print("[INFO] Сервер настроен для работы через Cloudflare Tunnel")
    print("[INFO] Включено расширенное логирование")

    # Запуск Flask в отдельном потоке
    flask_thread = threading.Thread(target=run_flask, args=(app,), daemon=True)
    flask_thread.start()

    if not wait_for_server():
        print("[ERROR] Flask сервер не запустился")
        exit(1)
    FLASK_READY.set()

    # Запускаем Cloudflare туннель
    tunnel_thread = threading.Thread(target=start_cloudflare_tunnel, daemon=True)
    tunnel_thread.start()

    if not TUNNEL_READY.wait(timeout=30):
        print("[ERROR] Cloudflare туннель не запустился")
        exit(1)

    # Запуск Telethon-скрейпера
    start_telegram_scraper(app)

    # В конце main.py
    telegram_bot_thread = threading.Thread(target=run_bot, daemon=True)
    telegram_bot_thread.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[INFO] Завершение работы...")
