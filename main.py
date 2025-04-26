import os
import threading
import subprocess
import time
import requests
import logging
import webbrowser

from flask import Flask, request, redirect, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_migrate import Migrate

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
SESSION_NAME = "my_session"
CHANNELS = [
    "https://t.me/fashionab1ee",
    "https://t.me/testfcknew",
]

# Настройки Cloudflare
CLOUDFLARED_PATH = r"C:\Program Files\Cloudflare\cloudflared.exe"
TUNNEL_ID = "3794b256-70f9-4f6c-a5a9-6ae640e8854b"

FLASK_READY = threading.Event()

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

def start_cloudflare_tunnel():
    """Запускает Cloudflare туннель"""
    try:
        print("[CLOUDFLARE] Запуск туннеля...")
        tunnel_process = subprocess.Popen(
            [
                CLOUDFLARED_PATH,
                "tunnel",
                "--config",
                os.path.join(os.environ["USERPROFILE"], ".cloudflared", "config.yml"),
                "run",
                TUNNEL_ID
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        def log_output(process):
            while True:
                line = process.stdout.readline()
                if not line:
                    break
                print("[CLOUDFLARE]", line.strip())

        def log_errors(process):
            while True:
                line = process.stderr.readline()
                if not line:
                    break
                print("[CLOUDFLARE ERROR]", line.strip())

        threading.Thread(target=log_output, args=(tunnel_process,), daemon=True).start()
        threading.Thread(target=log_errors, args=(tunnel_process,), daemon=True).start()

        return tunnel_process
    except Exception as e:
        print(f"[CLOUDFLARE] 🔴 Ошибка запуска туннеля: {e}")
        return None

def check_site_status(url, timeout=30):
    print(f"[SITE] Проверка доступности сайта {url}...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, verify=False)
            if response.status_code == 200:
                print(f"[SITE] 🟢 Сайт доступен: {url}")
                return True
        except requests.exceptions.RequestException:
            time.sleep(1)
    print(f"[SITE] 🔴 Сайт недоступен: {url}")
    return False

def create_app(config_class=Config):
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_class)
    app.config["SQLALCHEMY_DATABASE_URI"] = config_class.DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Настройка ProxyFix для работы с Cloudflare
    app.wsgi_app = ProxyFix(
        app.wsgi_app,
        x_for=2,
        x_proto=2,
        x_host=1,
        x_prefix=1,
        x_port=1
    )

    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()
        print("\nЗарегистрированные маршруты:")
        for rule in app.url_map.iter_rules():
            print(f"{rule.endpoint}: {rule.methods} {rule}")
        print("\n")

    @app.before_request
    def before_request():
        if Config.CLOUDFLARE_ENABLED:
            if not request.is_secure and request.headers.get("X-Forwarded-Proto", "http") != "https":
                if not request.host.startswith(("127.0.0.1", "localhost")):
                    url = request.url.replace("http://", "https://", 1)
                    return redirect(url, code=301)

    @app.route("/health")
    def health_check():
        return {"status": "healthy"}, 200

    return app

def run_flask(app):
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False
    )

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

def main():
    configure_logging()
    app = create_app()
    
    print("\n=== Запуск приложения ===")
    print(f"[CONFIG] Домен: {Config.CLOUDFLARE_DOMAIN}")
    print(f"[CONFIG] Cloudflare: {'Включен' if Config.CLOUDFLARE_ENABLED else 'Отключен'}")
    print(f"[CONFIG] Режим: {'Production' if not Config.DEBUG else 'Development'}")
    print(f"[CONFIG] URL: {Config.PUBLIC_URL}")
    print("=======================\n")
    
    # Запускаем Cloudflare туннель
    if Config.CLOUDFLARE_ENABLED:
        tunnel_process = start_cloudflare_tunnel()
        if not tunnel_process:
            print("[CLOUDFLARE] ⚠️ Не удалось запустить туннель")
            return
        
        # Даем туннелю время на запуск
        time.sleep(5)
    
    # Запускаем Flask в отдельном потоке
    flask_thread = threading.Thread(target=run_flask, args=(app,))
    flask_thread.daemon = True
    flask_thread.start()
    
    # Запускаем Telegram бота
    bot_thread = threading.Thread(target=run_bot)
    bot_thread.daemon = True
    bot_thread.start()
    
    # Запускаем Telegram скрейпер
    scraper_thread = threading.Thread(target=start_telegram_scraper, args=(app,))
    scraper_thread.daemon = True
    scraper_thread.start()
    
    # Проверяем доступность сайта
    if Config.CLOUDFLARE_ENABLED:
        site_url = f"https://{Config.CLOUDFLARE_DOMAIN}"
        if check_site_status(site_url):
            print(f"[SITE] 🎉 Сайт успешно запущен на {site_url}")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n=== Завершение работы приложения ===")
        print("[SITE] Сайт будет недоступен")
        print("[CLOUDFLARE] Туннель будет закрыт")
        print("===============================\n")
        if Config.CLOUDFLARE_ENABLED and tunnel_process:
            tunnel_process.terminate()
        os._exit(0)

if __name__ == "__main__":
    main()
