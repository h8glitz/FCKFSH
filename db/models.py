# models.py
import logging
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

# Настройка логирования
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    photo_url = db.Column(db.String(255))  # Ссылка на аватар пользователя
    role = db.Column(db.String(20), default="user")  # 'user' / 'moderator' / 'admin'
    glams = db.Column(db.Integer, default=0)  # Валюта глэмы
    sapphires = db.Column(db.Integer, default=0)  # Донат валюта сапфиры
    inventory = db.Column(JSONB, default=[])  # Инвентарь пользователя (массив ID предметов)
    additional_data = db.Column(JSONB)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    language_code = db.Column(db.String(10), default="en")
    is_premium = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.username}>"

    def add_item_to_inventory(self, item_id):
        """Добавляет предмет в инвентарь"""
        if self.inventory is None:
            self.inventory = []
        if item_id not in self.inventory:
            self.inventory.append(item_id)
            db.session.commit()
            return True
        return False

    def remove_item_from_inventory(self, item_id):
        """Удаляет предмет из инвентаря"""
        if self.inventory and item_id in self.inventory:
            self.inventory.remove(item_id)
            db.session.commit()
            return True
        return False

    def has_item(self, item_id):
        """Проверяет, есть ли предмет в инвентаре"""
        return self.inventory and item_id in self.inventory

    def get_inventory_items(self):
        """Получает все предметы из инвентаря"""
        if not self.inventory:
            return []
        return Item.query.filter(Item.id.in_(self.inventory)).all()

    def to_dict(self, include_items=False):
        """
        Преобразует объект в словарь
        :param include_items: Если True, включает полную информацию о предметах
        """
        data = {
            "id": self.id,
            "username": self.username,
            "photo_url": self.photo_url,
            "role": self.role,
            "glams": self.glams,
            "sapphires": self.sapphires,
            "inventory": self.inventory or [],
            "additional_data": self.additional_data,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "language_code": self.language_code,
            "is_premium": self.is_premium,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_items and self.inventory:
            # Получаем полную информацию о предметах
            items = Item.query.filter(Item.id.in_(self.inventory)).all()
            data["inventory_items"] = [item.to_dict() for item in items]
        
        return data


class Item(db.Model):
    __tablename__ = 'items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    rarity = db.Column(db.String(50), nullable=False)  # common, uncommon, rare, epic, legendary
    model_path = db.Column(db.String(500), nullable=False)  # Путь к 3D модели (.glb)
    preview_image = db.Column(db.String(500), nullable=False)  # Путь к превью изображению (.png)
    item_type = db.Column(db.String(50), nullable=False)  # Тип предмета (pants, shirt, hat и т.д.)
    stats = db.Column(JSONB, default={})  # Характеристики предмета
    default_quantity = db.Column(db.Integer, default=10000)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Item {self.name} ({self.rarity})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "rarity": self.rarity,
            "model_path": self.model_path,
            "preview_image": self.preview_image,
            "item_type": self.item_type,
            "stats": self.stats,
            "default_quantity": self.default_quantity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Brand(db.Model):
    __tablename__ = 'brands'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    creator_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    logo_url = db.Column(db.String(500), nullable=True)  # URL к логотипу бренда
    description = db.Column(db.Text, nullable=True)  # Описание бренда
    relevance = db.Column(db.Integer, default=0)  # Релевантность бренда
    popularity = db.Column(db.Integer, default=0)  # Популярность бренда
    innovativeness = db.Column(db.Integer, default=0)  # Инновативность бренда
    level = db.Column(db.Integer, default=1)  # Уровень бренда
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship('User', backref='created_brands')
    members = db.relationship('BrandMember', backref='brand', lazy=True)

    def __repr__(self):
        return f"<Brand {self.name} (Level {self.level})>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "creator_id": self.creator_id,
            "logo_url": self.logo_url,
            "description": self.description,
            "relevance": self.relevance,
            "popularity": self.popularity,
            "innovativeness": self.innovativeness,
            "level": self.level,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class BrandMember(db.Model):
    __tablename__ = 'brand_members'

    brand_id = db.Column(db.Integer, db.ForeignKey('brands.id'), primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), primary_key=True)
    role = db.Column(db.String(50), default='member')  # owner, admin, member
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='brand_memberships')

    def __repr__(self):
        return f"<BrandMember brand_id={self.brand_id} user_id={self.user_id} role={self.role}>"

    def to_dict(self):
        return {
            "brand_id": self.brand_id,
            "user_id": self.user_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None
        }


# ----------------------------------------------------------------------------------

class News(db.Model):
    __tablename__ = 'news'

    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.String(255), nullable=True)  # ID или username канала, откуда взято
    telegram_message_id = db.Column(db.Integer, nullable=True)  # ID сообщения в канале (опционально)

    title = db.Column(db.String(255), nullable=True)  # Заголовок (если есть)
    text = db.Column(db.Text, nullable=True)  # Основной текст новости
    image_url = db.Column(db.String(500), nullable=True)  # Ссылка (или file_id) на изображение
    video_url = db.Column(db.String(500), nullable=True)  # Ссылка (или file_id) на видео

    is_approved = db.Column(db.Boolean, default=False)  # Статус модерации
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<News id={self.id} channel={self.channel_id} approved={self.is_approved}>"

    def to_dict(self):
        return {
            "id": self.id,
            "channel_id": self.channel_id,
            "telegram_message_id": self.telegram_message_id,
            "title": self.title,
            "text": self.text,
            "image_url": self.image_url,
            "video_url": self.video_url,
            "is_approved": self.is_approved,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ----------------------------------------------------------------------------------

class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    news_id = db.Column(db.Integer, db.ForeignKey('news.id'), nullable=False)

    # <<< Новое поле для "Ответить на комментарий"
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)

    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='comments')
    news = db.relationship('News', backref='comments')

    # Связь для получения "дочерних" комментариев
    replies = db.relationship(
        'Comment',
        backref=db.backref('parent', remote_side=[id]),
        lazy='dynamic'
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "news_id": self.news_id,
            "parent_id": self.parent_id,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ----------------------------------------------------------------------------------

class Like(db.Model):
    __tablename__ = 'likes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    news_id = db.Column(db.Integer, db.ForeignKey('news.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='likes')
    news = db.relationship('News', backref='likes')

    def __repr__(self):
        return f"<Like id={self.id} user_id={self.user_id} news_id={self.news_id}>"



class NewsView(db.Model):
    __tablename__ = 'news_views'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    news_id = db.Column(db.Integer, db.ForeignKey('news.id'), nullable=False)
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Опционально, чтобы иметь relationship
    user = db.relationship('User', backref='views')
    news = db.relationship('News', backref='views')

    def __repr__(self):
        return f"<NewsView id={self.id} user_id={self.user_id} news_id={self.news_id}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "news_id": self.news_id,
            "viewed_at": self.viewed_at.isoformat() if self.viewed_at else None
        }

# ----------------------------------------------------------------------------------

class Friend(db.Model):
    """Модель для хранения информации о друзьях пользователей"""
    __tablename__ = 'friends'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    friend_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    friend_username = db.Column(db.String(255), nullable=False)
    friend_photo_url = db.Column(db.String(512), nullable=True)
    coins_earned = db.Column(db.Integer, default=0)  # Сколько монет накопили
    referral_bonus = db.Column(db.Integer, default=0)  # 5% от накопленных монет
    referrer_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=True)  # Кто привел
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Связи
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('friends', lazy=True))
    friend = db.relationship('User', foreign_keys=[friend_id], backref=db.backref('friend_of', lazy=True))
    referrer = db.relationship('User', foreign_keys=[referrer_id], backref=db.backref('referrals', lazy=True))

    def to_dict(self):
        """Преобразует объект в словарь"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'friend_id': self.friend_id,
            'friend_username': self.friend_username,
            'friend_photo_url': self.friend_photo_url,
            'coins_earned': self.coins_earned,
            'referral_bonus': self.referral_bonus,
            'referrer_id': self.referrer_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


def save_user_data(user_data):
    """Сохранение данных пользователя в БД."""
    try:
        user_id = user_data.get("id")  # Telegram ID
        username = user_data.get("username", "unknown")
        role = user_data.get("role", "user")
        photo_url = user_data.get("photo_url", "").strip()
        first_name = user_data.get("first_name", "")
        last_name = user_data.get("last_name", "")
        language_code = user_data.get("language_code", "en")
        is_premium = user_data.get("is_premium", False)
        is_verified = user_data.get("is_verified", False)

        logger.info(f"[save_user_data] Попытка сохранения пользователя: {user_id}")

        # Проверяем существование пользователя
        existing_user = User.query.filter_by(id=user_id).first()
        
        if existing_user:
            logger.info(f"[save_user_data] Обновление существующего пользователя: {user_id}")
            # Обновляем все поля
            existing_user.username = username
            existing_user.photo_url = photo_url
            existing_user.role = role
            existing_user.first_name = first_name
            existing_user.last_name = last_name
            existing_user.language_code = language_code
            existing_user.is_premium = is_premium
            existing_user.is_verified = is_verified
                
            # Обновляем дополнительные данные, сохраняя существующие
            if "additional_data" in user_data:
                current_data = existing_user.additional_data or {}
                current_data.update(user_data["additional_data"])
                existing_user.additional_data = current_data
        else:
            logger.info(f"[save_user_data] Создание нового пользователя: {user_id}")
            new_user = User(
                id=user_id,
                username=username,
                role=role,
                photo_url=photo_url,
                first_name=first_name,
                last_name=last_name,
                language_code=language_code,
                is_premium=is_premium,
                is_verified=is_verified,
                additional_data=user_data.get("additional_data", {}),
                glams=0,
                sapphires=0,
                inventory=[]
            )
            db.session.add(new_user)

        db.session.commit()
        logger.info(f"[save_user_data] Пользователь успешно сохранен: {user_id}")
        
        # Возвращаем обновленные данные пользователя
        user = User.query.get(user_id)
        return {"status": "success", "message": "User data saved.", "user": user.to_dict()}, 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"[save_user_data] Ошибка базы данных: {e}")
        return {"status": "error", "message": str(e)}, 500


def get_user_by_id(user_id):
    """Получение пользователя по ID с обработкой ошибок"""
    try:
        # Преобразуем user_id в int, если это строка
        if isinstance(user_id, str):
            try:
                user_id = int(user_id)
                logger.info(f"[get_user_by_id] Преобразован ID из строки в число: {user_id}")
            except ValueError:
                logger.error(f"[get_user_by_id] Невозможно преобразовать ID '{user_id}' в число")
                return None
        
        if user_id is None:
            logger.error("[get_user_by_id] Получен пустой ID")
            return None
            
        logger.info(f"[get_user_by_id] Поиск пользователя: {user_id}")
        user = User.query.get(user_id)
        
        if user is None:
            logger.error(f"[get_user_by_id] Пользователь не найден: {user_id}")
            return None
            
        logger.info(f"[get_user_by_id] Пользователь найден: {user.username}")
        return user
        
    except ValueError:
        logger.error(f"[get_user_by_id] Некорректный ID: {user_id}")
        return None
    except Exception as e:
        logger.error(f"[get_user_by_id] Ошибка: {str(e)}")
        return None


def init_db(app):
    """Инициализация базы данных"""
    db.init_app(app)
    with app.app_context():
        db.create_all()


