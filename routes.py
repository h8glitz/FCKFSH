import os
import hmac
import hashlib
import logging
from urllib.parse import parse_qs

from flask import Blueprint, render_template, request, jsonify, send_from_directory, redirect
from db.models import save_user_data, get_user_by_id, News, db, Like, User, Comment, NewsView, Brand, BrandMember, Item
from fck_app.bot import BOT_TOKEN, bot
from datetime import datetime, timedelta

# Настройка логирования
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

main_bp = Blueprint("main", __name__)

@main_bp.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(main_bp.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@main_bp.route("/")
def index():
    """Главная страница"""
    return render_template("index.html")

@main_bp.route('/app', methods=['GET'])
def app_page():
    """Рендерит страницу /app"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    return render_template("index.html", user_id=user_id)

@main_bp.route('/api/user_avatar', methods=['GET'])
def user_avatar():
    """Возвращает URL аватарки пользователя по user_id"""
    user_id = request.args.get('id')

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    try:
        user = get_user_by_id(user_id)  # Получаем пользователя из БД
        if not user:
            return jsonify({"error": "User not found"}), 404

        avatar_url = user.photo_url if user.photo_url else "/static/icons/default-avatar.png"

        return jsonify({"photo_url": avatar_url})
    except Exception as e:
        logger.error(f"Ошибка получения аватарки: {e}")
        return jsonify({"error": "Internal server error"}), 500

@main_bp.route('/get_avatar')
async def get_avatar():
    """Получение аватарки пользователя"""
    try:
        photo_url = request.args.get('photo_url')
        if not photo_url:
            logger.warning("[get_avatar] photo_url не передан")
            return send_from_directory('static/icons', 'default-avatar.png')

        # Если это file_id от Telegram
        if photo_url.startswith('AgACAgI'):
            try:
                # Проверяем наличие BOT_TOKEN
                if not BOT_TOKEN:
                    logger.error("[get_avatar] BOT_TOKEN не установлен")
                    return send_from_directory('static/icons', 'default-avatar.png')

                # Получаем файл через Telegram API
                file = await bot.get_file(photo_url)
                if file and file.file_path:
                    # Получаем URL файла
                    file_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file.file_path}"
                    logger.info(f"[get_avatar] Получен URL файла: {file_url}")
                    return redirect(file_url)
                else:
                    logger.warning("[get_avatar] Не удалось получить file_path")
                    return send_from_directory('static/icons', 'default-avatar.png')
            except Exception as e:
                logger.error(f"[get_avatar] Ошибка при получении файла из Telegram: {e}")
                return send_from_directory('static/icons', 'default-avatar.png')
        
        # Если это обычный URL
        if photo_url.startswith('http'):
            return redirect(photo_url)
        
        logger.warning(f"[get_avatar] Некорректный формат photo_url: {photo_url}")
        return send_from_directory('static/icons', 'default-avatar.png')

    except Exception as e:
        logger.error(f"[get_avatar] Внутренняя ошибка сервера: {e}")
        return send_from_directory('static/icons', 'default-avatar.png')

@main_bp.route('/init_user_data', methods=['POST'])
def init_user_data():
    """Сохранение данных пользователя, включая реальный URL аватарки"""
    try:
        user_data = request.json
        if not user_data:
            return jsonify({"error": "Нет данных"}), 400

        user_id = user_data.get("id")
        if not user_id:
            return jsonify({"error": "Не передан ID пользователя"}), 400

        # Логируем перед сохранением
        logger.info(f"[init_user_data] Переданные данные: {user_data}")

        # Подготавливаем данные для сохранения
        save_data = {
            "id": user_id,
            "username": user_data.get("username", "unknown"),
            "photo_url": user_data.get("photo_url", "").strip(),
            "role": user_data.get("role", "user"),
            "first_name": user_data.get("first_name", ""),
            "last_name": user_data.get("last_name", ""),
            "language_code": user_data.get("language_code", "en"),
            "is_premium": user_data.get("is_premium", False),
            "is_verified": user_data.get("is_verified", False),
            "additional_data": {
                k: v for k, v in user_data.items() 
                if k not in ["id", "username", "photo_url", "role", "first_name", 
                           "last_name", "language_code", "is_premium", "is_verified"]
            }
        }

        # Если photo_url не передан или некорректный, ставим аватарку по умолчанию
        if not save_data["photo_url"] or not save_data["photo_url"].startswith("http"):
            save_data["photo_url"] = "/static/icons/default-avatar.png"

        logger.info(f"[init_user_data] Итоговые данные для сохранения: {save_data}")

        result = save_user_data(save_data)
        return result

    except Exception as e:
        logger.error(f"[init_user_data] Ошибка сохранения данных: {e}")
        return jsonify({"error": "Internal server error"}), 500


@main_bp.route('/get_user_data', methods=['GET', 'POST'])
def get_user_data():
    """
    Получает или создает данные пользователя.
    Поддерживает методы GET и POST.
    """
    try:
        # Определяем метод запроса и получаем user_id
        if request.method == 'POST':
            data = request.get_json()
            if not data:
                logging.error('[get_user_data] Не получены данные JSON')
                return jsonify({"error": "Не получены данные JSON"}), 400
                
            user_id = data.get('id')
            user_data = data.get('user', {})
            logging.info(f"[get_user_data] Метод: POST, user_id: {user_id}")
            logging.info(f"[get_user_data] Данные из Telegram: {user_data}")
        else:  # GET
            user_id = request.args.get('id') or request.args.get('user_id')
            user_data = None
            logging.info(f"[get_user_data] Метод: GET, user_id: {user_id}")
        
        # Проверяем наличие user_id
        if not user_id:
            logging.error("[get_user_data] Не указан user_id")
            return jsonify({"error": "Не указан user_id"}), 400
        
        # Поиск пользователя в БД
        user = get_user_by_id(user_id)
        
        # Если пользователь найден
        if user:
            logging.info(f"[get_user_data] Пользователь найден: {user.username}")
            
            # Обновляем данные пользователя, если они есть в запросе
            if user_data and request.method == 'POST':
                # Обновляем только определенные поля, если они есть в запросе
                update_fields = {}
                
                # Проверяем все поля по отдельности для частичного обновления
                for field in ['username', 'photo_url', 'first_name', 'last_name', 
                              'language_code', 'is_premium', 'is_verified']:
                    if field in user_data and user_data[field] and user_data[field] != getattr(user, field):
                        update_fields[field] = user_data[field]
                
                # Если есть что обновлять, делаем это
                if update_fields:
                    logging.info(f"[get_user_data] Обновляем данные пользователя {user_id}: {update_fields}")
                    for field, value in update_fields.items():
                        setattr(user, field, value)
                    db.session.commit()
                    # Получаем обновленные данные
                    user = get_user_by_id(user_id)
            
            # Получаем полную информацию о предметах в инвентаре
            items = []
            if user.inventory:
                try:
                    items = Item.query.filter(Item.id.in_(user.inventory)).all()
                    items = [item.to_dict() for item in items]
                    logging.info(f"[get_user_data] Найдено {len(items)} предметов в инвентаре: {items}")
                except Exception as e:
                    logging.error(f"[get_user_data] Ошибка при получении предметов: {e}")
            
            # Получаем данные пользователя с предметами
            user_dict = user.to_dict()
            user_dict['items'] = items
            
            logging.info(f"[get_user_data] Отправляем данные пользователя с {len(items)} предметами: {user_dict}")
            return jsonify(user_dict), 200
        
        # Если пользователь не найден, создаем нового
        logging.info(f"[get_user_data] Пользователь не найден, создаем нового: {user_id}")
        
        # Используем данные из Telegram, если они есть
        username = user_data.get('username', f"user_{user_id}") if user_data else f"user_{user_id}"
        photo_url = user_data.get('photo_url', '/static/icons/default-avatar.png') if user_data else '/static/icons/default-avatar.png'
        first_name = user_data.get('first_name', '') if user_data else ''
        last_name = user_data.get('last_name', '') if user_data else ''
        language_code = user_data.get('language_code', 'en') if user_data else 'en'
        is_premium = user_data.get('is_premium', False) if user_data else False
        is_verified = user_data.get('is_verified', False) if user_data else False
        
        # Создаем нового пользователя с данными из Telegram или значениями по умолчанию
        new_user = User(
            id=user_id,
            username=username,
            photo_url=photo_url,
            role='user',
            first_name=first_name,
            last_name=last_name,
            language_code=language_code,
            is_premium=is_premium,
            is_verified=is_verified,
            additional_data={
                'registration_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'last_active': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        )
        
        try:
            db.session.add(new_user)
            db.session.commit()
            logging.info(f"[get_user_data] Пользователь успешно создан: {user_id}")
            return jsonify(new_user.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            logging.error(f"[get_user_data] Ошибка при создании пользователя: {e}")
            return jsonify({"error": "Ошибка при создании пользователя"}), 500
    
    except Exception as e:
        error_msg = f"[get_user_data] Внутренняя ошибка сервера: {str(e)}"
        logging.exception(error_msg)
        return jsonify({"error": error_msg}), 500



@main_bp.route("/verify_init_data", methods=['POST'])
def verify_init_data():
    """Проверка корректности initData из Telegram WebApp"""
    data = request.get_json()
    init_data = data.get("initData", "")

    if verify_telegram_init_data(parse_qs(init_data)):
        return jsonify({"valid": True})
    return jsonify({"valid": False}), 400


def verify_telegram_init_data(init_data):
    """Проверка корректности initData из Telegram WebApp"""
    try:
        data_check_arr = []
        data_to_check = init_data.copy()
        received_hash = data_to_check.pop("hash", "")

        for key in sorted(data_to_check.keys()):
            data_check_arr.append(f"{key}={data_to_check[key]}")
        data_check_string = "\n".join(data_check_arr)

        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        return hmac.compare_digest(computed_hash, received_hash)
    except Exception as e:
        logger.error(f"Error in verify_telegram_init_data: {e}")
        return False


@main_bp.route("/api/news/approved", methods=["GET"])
def get_approved_news():
    user_id = request.args.get('user_id', type=int)
    news_items = News.query.filter_by(is_approved=True).all()

    results = []
    for item in news_items:
        data = item.to_dict()

        # Подсчитываем уникальные просмотры
        viewers_count = NewsView.query.filter_by(news_id=item.id).count()

        # Количество лайков (уже считаете)
        likes_count = Like.query.filter_by(news_id=item.id).count()

        # Проверяем, лайкнул ли юзер
        liked_by_user = False
        if user_id:
            liked = Like.query.filter_by(user_id=user_id, news_id=item.id).first()
            liked_by_user = bool(liked)


        data = item.to_dict()
        data["likes_count"] = likes_count
        data["is_liked_by_user"] = liked_by_user
        data["comment_count"] = Comment.query.filter_by(news_id=item.id).count()
        data["viewers_count"] = viewers_count

        results.append(data)

    return jsonify(results), 200


@main_bp.route("/api/news/moderation", methods=["GET"])
def get_unapproved_news():
    news_items = News.query.filter_by(is_approved=False).all()
    return jsonify([item.to_dict() for item in news_items]), 200


@main_bp.route("/api/news/approve/<int:news_id>", methods=["POST"])
def approve_news(news_id):
    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify({"error": "News not found"}), 404

    news_item.is_approved = True
    db.session.commit()
    return jsonify({"status": "success"}), 200

@main_bp.route("/api/news/delete/<int:news_id>", methods=["DELETE"])
def delete_news(news_id):
    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify({"error": "News not found"}), 404

    db.session.delete(news_item)
    db.session.commit()
    return jsonify({"status": "success"}), 200

@main_bp.route("/templates/<path:filename>")
def serve_template_file(filename):
    return send_from_directory("templates", filename)

@main_bp.route("/api/news/<int:news_id>/like", methods=["POST"])
def like_news(news_id):
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "No user_id provided"}), 400

    # Проверка, существует ли такой пользователь в базе
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": f"User {user_id} not found"}), 404

    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify({"error": "News not found"}), 404

    existing_like = Like.query.filter_by(user_id=user_id, news_id=news_id).first()
    if existing_like:
        return jsonify({"error": "Already liked"}), 400

    new_like = Like(user_id=user_id, news_id=news_id)
    db.session.add(new_like)
    db.session.commit()

    likes_count = Like.query.filter_by(news_id=news_id).count()
    return jsonify({
        "status": "success",
        "message": "Like added",
        "likes_count": likes_count
    }), 201


# --------------------
# Убрать лайк
# --------------------
@main_bp.route("/api/news/<int:news_id>/like", methods=["DELETE"])
def unlike_news(news_id):
    user_id = request.json.get("user_id", 1)
    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify({"error": "News not found"}), 404

    existing_like = Like.query.filter_by(user_id=user_id, news_id=news_id).first()
    if not existing_like:
        return jsonify({"error": "Like not found"}), 404

    db.session.delete(existing_like)
    db.session.commit()

    # Количество лайков после удаления
    likes_count = Like.query.filter_by(news_id=news_id).count()

    return jsonify({
        "status": "success",
        "message": "Like removed",
        "likes_count": likes_count
    }), 200


@main_bp.route("/log-device-info", methods=["POST"])
def log_device_info():
    """Принимает и логирует информацию об устройстве пользователя."""
    try:
        device_info = request.json  # Получаем данные в формате JSON
        if not device_info:
            return jsonify({"error": "Нет данных"}), 400

        logger.info(f"[log-device-info] Данные об устройстве: {device_info}")

        return jsonify({"status": "success", "message": "Данные об устройстве получены и залогированы"}), 200
    except Exception as e:
        logger.error(f"[log-device-info] Ошибка обработки данных: {e}")
        return jsonify({"error": "Internal server error"}), 500


@main_bp.route('/api/user/current', methods=['GET'])
def get_current_user():
    """Получение текущего пользователя"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            logger.error("[get_current_user] Не передан user_id")
            return jsonify({"error": "User ID is required"}), 400

        user = User.query.get(user_id)
        if not user:
            logger.error(f"[get_current_user] Пользователь не найден: {user_id}")
            return jsonify({"error": "User not found"}), 404

        user_data = user.to_dict()
        logger.info(f"[get_current_user] Успешно получены данные пользователя: {user_id}")

        return jsonify({
            "status": "success",
            "user": user_data
        })

    except Exception as e:
        logger.error(f"[get_current_user] Ошибка получения пользователя: {e}")
        return jsonify({"error": "Internal server error"}), 500


# Опциональный роут для проверки авторизации
@main_bp.route('/api/user/check', methods=['GET'])
def check_user():
    """Проверка существования пользователя"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"exists": False}), 200

        user = User.query.get(user_id)
        return jsonify({
            "exists": bool(user),
            "role": user.role if user else None
        }), 200

    except Exception as e:
        logger.error(f"[check_user] Ошибка проверки пользователя: {e}")
        return jsonify({"error": "Internal server error"}), 500


@main_bp.route("/api/news/<int:news_id>/comments", methods=["GET"])
def get_comments_for_news(news_id):
    """Возвращает список комментариев к конкретной новости."""
    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify({"error": "News not found"}), 404

    # Если нужны все комментарии плоским списком:
    comments = Comment.query.filter_by(news_id=news_id).order_by(Comment.created_at.asc()).all()

    # Хотите вместе с данными о пользователе?
    # Можно собрать результат так:
    response_data = []
    for c in comments:
        c_dict = c.to_dict()
        # Добавляем данные о юзере, чтобы не делать лишних запросов
        c_dict["user"] = {
            "id": c.user.id,
            "username": c.user.username,
            "photo_url": c.user.photo_url
        }
        response_data.append(c_dict)

    return jsonify(response_data), 200

@main_bp.route("/api/news/<int:news_id>/comments", methods=["POST"])
def add_comment_to_news(news_id):
    """Добавляет новый комментарий к новости."""
    data = request.json
    user_id = data.get("user_id")
    text = data.get("text")
    parent_id = data.get("parent_id")  # Если реализуем треды

    if not user_id or not text:
        return jsonify({"error": "user_id and text are required"}), 400

    # Проверяем, что новость существует
    news_item = News.query.get(news_id)
    if not news_item:
        return jsonify({"error": "News not found"}), 404

    # Проверяем, что пользователь есть
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Создаём комментарий
    new_comment = Comment(
        user_id=user_id,
        news_id=news_id,
        text=text
    )
    # Если есть parent_id, и вы используете иерархию:
    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if parent_comment:
            new_comment.parent_id = parent_id

    db.session.add(new_comment)
    db.session.commit()

    # Возвращаем свежесозданный комментарий
    # (Добавим сюда и данные пользователя)
    response_data = new_comment.to_dict()
    response_data["user"] = {
        "id": user.id,
        "username": user.username,
        "photo_url": user.photo_url
    }
    return jsonify(response_data), 201

@main_bp.route("/api/news/<int:news_id>", methods=["GET"])
def get_single_news(news_id):
    user_id = request.args.get('user_id', type=int)
    news_item = News.query.get(news_id)

    if not news_item:
        return jsonify({"error": "News not found"}), 404

    # Считаем количество лайков
    likes_count = Like.query.filter_by(news_id=news_id).count()

    # Проверяем, лайкал ли пользователь
    is_liked_by_user = False
    if user_id:
        liked = Like.query.filter_by(user_id=user_id, news_id=news_id).first()
        is_liked_by_user = bool(liked)

    # Считаем количество комментариев
    comment_count = Comment.query.filter_by(news_id=news_id).count()

    data = news_item.to_dict()
    data["likes_count"] = likes_count
    data["is_liked_by_user"] = is_liked_by_user
    data["comment_count"] = comment_count  # <-- добавили
    data["viewers_count"] = NewsView.query.filter_by(news_id=news_id).count()

    return jsonify(data), 200


from datetime import datetime, timedelta


@main_bp.route("/api/news/<int:news_id>/view", methods=["POST"])
def add_news_view(news_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")

    logger.info(f"[add_news_view] Запрос на добавление просмотра: news_id={news_id}, user_id={user_id}")

    if not user_id:
        logger.warning("[add_news_view] user_id отсутствует в запросе")
        return jsonify({"error": "user_id is required"}), 400

    # Проверяем, что новость существует
    news_item = News.query.get(news_id)
    if not news_item:
        logger.warning(f"[add_news_view] Новость {news_id} не найдена")
        return jsonify({"error": "News not found"}), 404

    # Проверяем, что пользователь существует
    user = User.query.get(user_id)
    if not user:
        logger.warning(f"[add_news_view] Пользователь {user_id} не найден")
        return jsonify({"error": f"User {user_id} not found"}), 404

    # Находим последнюю запись просмотра пользователя этой новости
    existing_view = NewsView.query \
        .filter_by(news_id=news_id, user_id=user_id) \
        .order_by(NewsView.viewed_at.desc()) \
        .first()

    MIN_INTERVAL_SECONDS = 30
    now = datetime.utcnow()
    should_add_new_view = False

    if existing_view:
        time_diff = now - existing_view.viewed_at
        logger.info(
            f"[add_news_view] Последний просмотр: {existing_view.viewed_at}, разница: {time_diff.total_seconds()} сек.")

        # Если прошло больше 10 секунд, добавляем новый просмотр
        if time_diff.total_seconds() > MIN_INTERVAL_SECONDS:
            should_add_new_view = True
        else:
            logger.info(
                f"[add_news_view] Повторный просмотр слишком быстро ({time_diff.total_seconds()} сек.), новый не добавляем.")
    else:
        should_add_new_view = True

    if should_add_new_view:
        new_view = NewsView(news_id=news_id, user_id=user_id, viewed_at=now)
        db.session.add(new_view)
        try:
            db.session.commit()
            logger.info(f"[add_news_view] Добавлен просмотр: news_id={news_id}, user_id={user_id}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"[add_news_view] Ошибка при добавлении записи в NewsView: {e}")
            return jsonify({"error": "Database error"}), 500
    else:
        logger.info(f"[add_news_view] Новый просмотр не добавлен, так как прошло меньше {MIN_INTERVAL_SECONDS} сек.")

    # Подсчитываем количество уникальных просмотров
    viewers_count = NewsView.query.filter_by(news_id=news_id).count()
    logger.info(f"[add_news_view] Итоговое количество просмотров для news_id={news_id}: {viewers_count}")

    return jsonify({
        "status": "success",
        "viewers_count": viewers_count
    }), 200

@main_bp.route("/api/brands", methods=["GET"])
def get_brands():
    """Получение списка всех брендов"""
    try:
        brands = Brand.query.all()
        return jsonify({
            "status": "success",
            "brands": [brand.to_dict() for brand in brands]
        }), 200
    except Exception as e:
        logger.error(f"Ошибка при получении списка брендов: {e}")
        return jsonify({
            "status": "error",
            "message": "Внутренняя ошибка сервера"
        }), 500

@main_bp.route("/api/brands/<int:brand_id>", methods=["GET"])
def get_brand(brand_id):
    """Получение данных конкретного бренда по ID"""
    try:
        brand = Brand.query.get(brand_id)
        
        if not brand:
            logger.warning(f"[get_brand] Бренд с ID {brand_id} не найден")
            return jsonify({
                "status": "error",
                "message": f"Бренд с ID {brand_id} не найден"
            }), 404
            
        # Получаем данные о членах бренда
        brand_members = BrandMember.query.filter_by(brand_id=brand_id).all()
        members_data = []
        
        for member in brand_members:
            user = User.query.get(member.user_id)
            if user:
                members_data.append({
                    "user_id": user.id,
                    "username": user.username,
                    "photo_url": user.photo_url,
                    "role": member.role,
                    "joined_at": member.joined_at.isoformat() if member.joined_at else None
                })
        
        # Готовим данные бренда
        brand_data = brand.to_dict()
        
        # Добавляем расчетные поля для отображения в интерфейсе
        brand_data["members"] = members_data
        brand_data["members_count"] = len(members_data)
        
        # Преобразуем поля в проценты для отображения в интерфейсе
        brand_data["reputation"] = brand.relevance  # процент репутации
        brand_data["profitability"] = brand.popularity  # процент прибыльности
        brand_data["innovation"] = brand.innovativeness  # процент инноваций
        
        return jsonify({
            "status": "success",
            "brand": brand_data
        }), 200
    except Exception as e:
        logger.error(f"[get_brand] Ошибка при получении данных бренда {brand_id}: {e}")
        return jsonify({
            "status": "error",
            "message": "Внутренняя ошибка сервера"
        }), 500

@main_bp.route("/api/brands", methods=["POST"])
def create_brand():
    """Создание нового бренда"""
    try:
        # Логирование всех данных запроса
        logger.info(f"[create_brand] Получен POST-запрос: {request.method}")
        logger.info(f"[create_brand] Заголовки: {dict(request.headers)}")
        logger.info(f"[create_brand] Form данные: {dict(request.form)}")
        logger.info(f"[create_brand] Файлы: {request.files}")
        logger.info(f"[create_brand] URL params: {dict(request.args)}")
        
        # Получение данных из формы
        name = request.form.get('name')
        description = request.form.get('description', '')
        
        # Проверка обязательных полей
        if not name:
            logger.warning("[create_brand] Отсутствует название бренда")
            return jsonify({
                "status": "error",
                "message": "Название бренда обязательно"
            }), 400
        
        # Попытка получить user_id из разных источников
        user_id = request.args.get('user_id') or request.form.get('user_id')
        logger.info(f"[create_brand] Получен user_id из параметров/формы: {user_id}")
        
        # Проверяем заголовок X-User-ID
        if not user_id:
            user_id_header = request.headers.get('X-User-ID')
            if user_id_header:
                user_id = user_id_header
                logger.info(f"[create_brand] Получен user_id из заголовка X-User-ID: {user_id}")
        
        # Если user_id не найден, проверяем URL реферера
        if not user_id:
            referer = request.headers.get('Referer', '')
            logger.info(f"[create_brand] Реферер: {referer}")
            
            if 'user_id=' in referer:
                # Извлекаем user_id из URL реферера
                import re
                matches = re.search(r'user_id=(\d+)', referer)
                if matches:
                    user_id = matches.group(1)
                    logger.info(f"[create_brand] Получен user_id из реферера: {user_id}")
        
        # Если по-прежнему нет user_id, пробуем получить из оригинального URL
        if not user_id:
            origin_url = request.headers.get('Origin', '')
            logger.info(f"[create_brand] Origin URL: {origin_url}")
            
            for header_name, header_value in request.headers.items():
                logger.info(f"[create_brand] Заголовок {header_name}: {header_value}")
        
        # Если user_id всё еще не найден
        if not user_id:
            logger.warning("[create_brand] Отсутствует user_id во всех проверенных источниках")
            return jsonify({
                "status": "error",
                "message": "ID пользователя обязателен. Пожалуйста, убедитесь, что вы авторизованы."
            }), 400
            
        user = get_user_by_id(user_id)
        if not user:
            logger.warning(f"[create_brand] Пользователь с ID {user_id} не найден, создаю нового пользователя")
            # Создаем нового пользователя с минимальными данными
            new_user = {
                'id': user_id,
                'username': f"user_{user_id}",
                'photo_url': '',
                'role': 'user',
                'additional_data': {
                    'registration_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'created_from': 'brand_creation'
                }
            }
            # Сохраняем нового пользователя
            result = save_user_data(new_user)
            if result[1] != 200:
                logger.error(f"[create_brand] Не удалось создать пользователя с ID {user_id}")
                return jsonify({
                    "status": "error",
                    "message": "Не удалось создать пользователя"
                }), 500
            
            # Получаем созданного пользователя
            user = get_user_by_id(user_id)
            if not user:
                logger.error(f"[create_brand] Не удалось получить созданного пользователя с ID {user_id}")
                return jsonify({
                    "status": "error",
                    "message": "Внутренняя ошибка сервера"
                }), 500
            
        logger.info(f"[create_brand] Пользователь найден: {user.username} (ID: {user.id})")
            
        # Обработка загруженного логотипа, если есть
        logo_path = None
        if 'logo' in request.files:
            logo = request.files['logo']
            if logo and logo.filename:
                # Сохраняем файл с безопасным именем
                from werkzeug.utils import secure_filename
                import os
                
                # Создаем директорию для логотипов, если не существует
                logos_dir = os.path.join('static', 'brands', 'logos')
                os.makedirs(logos_dir, exist_ok=True)
                
                # Генерируем уникальное имя файла
                filename = secure_filename(f"{user_id}_{name}_{int(datetime.utcnow().timestamp())}.jpg")
                file_path = os.path.join(logos_dir, filename)
                
                # Сохраняем файл
                logo.save(file_path)
                logo_path = f"/static/brands/logos/{filename}"
                logger.info(f"[create_brand] Сохранен логотип: {logo_path}")
        
        # Создание нового бренда
        new_brand = Brand(
            name=name,
            creator_id=user_id,
            logo_url=logo_path,
            description=description,
            relevance=0,
            popularity=0,
            innovativeness=0,
            level=1
        )
        
        db.session.add(new_brand)
        db.session.commit()
        logger.info(f"[create_brand] Создан новый бренд: {name} (ID: {new_brand.id})")
        
        # Создание связи пользователя с брендом (владелец)
        brand_member = BrandMember(
            brand_id=new_brand.id,
            user_id=user_id,
            role='owner'
        )
        
        db.session.add(brand_member)
        db.session.commit()
        logger.info(f"[create_brand] Пользователь {user_id} назначен владельцем бренда {new_brand.id}")
        
        return jsonify({
            "status": "success",
            "brand": new_brand.to_dict(),
            "message": "Бренд успешно создан"
        }), 201
        
    except Exception as e:
        logger.error(f"[create_brand] Ошибка при создании бренда: {e}")
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": f"Внутренняя ошибка сервера при создании бренда: {str(e)}"
        }), 500

@main_bp.route("/api/user/<int:user_id>/brands", methods=["GET"])
def get_user_brands(user_id):
    """Получение всех брендов пользователя"""
    try:
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"[get_user_brands] Пользователь с ID {user_id} не найден")
            return jsonify({
                "status": "error",
                "message": f"Пользователь с ID {user_id} не найден"
            }), 404
        
        # Получаем все участия пользователя в брендах
        brand_memberships = BrandMember.query.filter_by(user_id=user_id).all()
        
        if not brand_memberships:
            logger.info(f"[get_user_brands] У пользователя {user_id} нет брендов")
            return jsonify({
                "status": "success",
                "brands": []
            }), 200
        
        # Получаем данные о всех брендах пользователя
        user_brands = []
        for membership in brand_memberships:
            brand = Brand.query.get(membership.brand_id)
            if brand:
                brand_data = brand.to_dict()
                brand_data["role"] = membership.role  # роль пользователя в этом бренде
                brand_data["joined_at"] = membership.joined_at.isoformat() if membership.joined_at else None
                
                # Проверка, является ли пользователь создателем бренда
                brand_data["is_creator"] = (brand.creator_id == user_id)
                
                user_brands.append(brand_data)
        
        return jsonify({
            "status": "success",
            "brands": user_brands
        }), 200
    except Exception as e:
        logger.error(f"[get_user_brands] Ошибка при получении брендов пользователя {user_id}: {e}")
        return jsonify({
            "status": "error",
            "message": "Внутренняя ошибка сервера"
        }), 500

@main_bp.route('/api/user/inventory', methods=['GET'])
def get_user_inventory():
    """Получение инвентаря пользователя с полной информацией о предметах"""
    try:
        # Получаем user_id из параметров запроса
        user_id = request.args.get('user_id')
        if not user_id:
            logger.error("[get_user_inventory] Не указан user_id")
            return jsonify({"error": "User ID not provided"}), 400

        # Получаем пользователя
        user = get_user_by_id(user_id)
        if not user:
            logger.error(f"[get_user_inventory] Пользователь не найден: {user_id}")
            return jsonify({"error": "User not found"}), 404

        # Получаем предметы из инвентаря
        if not user.inventory:
            logger.info(f"[get_user_inventory] Инвентарь пользователя {user_id} пуст")
            return jsonify({"inventory": []})

        # Получаем полную информацию о предметах
        items = Item.query.filter(Item.id.in_(user.inventory)).all()
        inventory_items = [item.to_dict() for item in items]
        
        logger.info(f"[get_user_inventory] Найдено {len(inventory_items)} предметов для пользователя {user_id}")
        logger.debug(f"[get_user_inventory] Предметы: {inventory_items}")

        return jsonify({
            "inventory": inventory_items,
            "total_items": len(inventory_items)
        })

    except Exception as e:
        logger.error(f"[get_user_inventory] Ошибка: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@main_bp.route('/inventory')
def inventory():
    return render_template('inventory.html')




