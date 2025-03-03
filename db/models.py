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
    additional_data = db.Column(JSONB)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "photo_url": self.photo_url,
            "role": self.role,
            "additional_data": self.additional_data,
            "created_at": self.created_at.isoformat() if self.created_at else None
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

def save_user_data(user_data):
    """Сохранение данных пользователя в БД (пример из вашего кода)."""
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
                additional_data=user_data
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


