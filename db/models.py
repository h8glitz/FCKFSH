# models.py
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    photo_url = db.Column(db.String(255))  # Ссылка на аватар пользователя
    role = db.Column(db.String(20), default="user")  # 'user' / 'moderator' / 'admin'
    glams = db.Column(db.Integer, default=0)  # Валюта глэмы
    sapphires = db.Column(db.Integer, default=0)  # Донат валюта сапфиры
    inventory = db.Column(JSONB, default=[])  # Инвентарь пользователя
    additional_data = db.Column(JSONB)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "photo_url": self.photo_url,
            "role": self.role,
            "glams": self.glams,
            "sapphires": self.sapphires,
            "inventory": self.inventory,
            "additional_data": self.additional_data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Item(db.Model):
    __tablename__ = 'items'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    rarity = db.Column(db.String(50), nullable=False)  # common, uncommon, rare, epic, legendary
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
            "default_quantity": self.default_quantity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Brand(db.Model):
    __tablename__ = 'brands'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    news_id = db.Column(db.Integer, db.ForeignKey('news.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='likes')
    news = db.relationship('News', backref='likes')

    def __repr__(self):
        return f"<Like id={self.id} user_id={self.user_id} news_id={self.news_id}>"



class NewsView(db.Model):
    __tablename__ = 'news_views'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    friend_username = db.Column(db.String(255), nullable=False)
    friend_photo_url = db.Column(db.String(512), nullable=True)
    coins_earned = db.Column(db.Integer, default=0)  # Сколько монет накопили
    referral_bonus = db.Column(db.Integer, default=0)  # 5% от накопленных монет
    referrer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Кто привел
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
        photo_url = user_data.get("photo_url")

        existing_user = User.query.filter_by(id=user_id).first()
        if existing_user:
            existing_user.username = username
            existing_user.role = role
            existing_user.photo_url = photo_url
            existing_user.additional_data = user_data
        else:
            new_user = User(
                id=user_id,
                username=username,
                role=role,
                photo_url=photo_url,
                additional_data=user_data,
                glams=0,
                sapphires=0,
                inventory=[]
            )
            db.session.add(new_user)
        db.session.commit()
        return {"status": "success", "message": "User data saved."}, 200

    except Exception as e:
        db.session.rollback()
        print(f"[save_user_data] Ошибка базы данных: {e}")
        return {"status": "error", "message": str(e)}, 500


def get_user_by_id(user_id):
    try:
        user = User.query.filter_by(id=user_id).first()
        return user
    except Exception as e:
        print(f"Ошибка поиска пользователя: {e}")
        raise


def init_db(app):
    """Инициализация базы данных"""
    db.init_app(app)
    with app.app_context():
        db.create_all()


