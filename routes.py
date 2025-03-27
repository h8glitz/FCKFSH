import os
import hmac
import hashlib
import logging
from urllib.parse import parse_qs

from flask import Blueprint, render_template, request, jsonify, send_from_directory, redirect
from db.models import save_user_data, get_user_by_id, News, db, Like, User, Comment, NewsView, Brand
from fck_app.bot import BOT_TOKEN
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

@main_bp.route('/get_avatar', methods=['GET'])
def get_avatar():
    """Редирект на реальный URL аватарки пользователя"""
    photo_url = request.args.get('photo_url')
    if not photo_url:
        logger.error("Не передан параметр photo_url")
        return "Avatar not found", 404

    return redirect(photo_url)

@main_bp.route('/init_user_data', methods=['POST'])
def init_user_data():
    """Сохранение данных пользователя, включая реальный URL аватарки"""
    try:
        user_data = request.json
        if not user_data:
            return jsonify({"error": "Нет данных"}), 400

        user_id = user_data.get("id")
        username = user_data.get("username", "unknown")
        photo_url = user_data.get("photo_url", "").strip()
        role = user_data.get("role", "user")

        if not user_id:
            return jsonify({"error": "Не передан ID пользователя"}), 400

        # Логируем перед сохранением
        logger.info(f"[init_user_data] Переданные данные: {user_data}")
        logger.info(f"[init_user_data] Исходный photo_url: {photo_url}")

        # Если photo_url не передан или некорректный, ставим аватарку по умолчанию
        if not photo_url or not photo_url.startswith("http"):
            photo_url = "/static/icons/default-avatar.png"

        logger.info(f"[init_user_data] Итоговый photo_url для сохранения: {photo_url}")

        save_user_data({
            "id": user_id,
            "username": username,
            "photo_url": photo_url,
            "role": role,
            "additional_data": user_data
        })

        return jsonify({"status": "success", "message": "User data saved."}), 200

    except Exception as e:
        logger.error(f"[init_user_data] Ошибка сохранения данных: {e}")
        return jsonify({"error": "Internal server error"}), 500


@main_bp.route('/get_user_data', methods=['POST', 'GET'])
def get_user_data():
    """Получение данных пользователя по user_id"""
    try:
        data = request.get_json() if request.method == 'POST' else request.args
        user_id = data.get('id')

        if not user_id:
            return jsonify({"error": "User id is required"}), 400

        logger.info(f"[get_user_data] Запрос данных для user_id: {user_id}")

        user = get_user_by_id(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        user_dict = user.to_dict()
        logger.info(f"[get_user_data] Данные из базы: {user_dict}")

        return jsonify(user_dict)

    except Exception as e:
        logger.error(f"[get_user_data] Ошибка при получении пользователя: {e}")
        return jsonify({"error": "Internal server error"}), 500




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




