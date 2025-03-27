import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from config import Config

def upgrade():
    """Создание таблицы friends"""
    engine = create_engine(Config.DATABASE_URI)
    
    with engine.connect() as connection:
        # Создаем таблицу friends
        connection.execute(text("""
            CREATE TABLE IF NOT EXISTS friends (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                friend_username VARCHAR(255) NOT NULL,
                friend_photo_url VARCHAR(512),
                coins_earned INTEGER DEFAULT 0,
                referral_bonus INTEGER DEFAULT 0,
                referrer_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (friend_id) REFERENCES users (id),
                FOREIGN KEY (referrer_id) REFERENCES users (id)
            )
        """))
        
        # Создаем индекс для быстрого поиска друзей пользователя
        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)
        """))
        
        # Создаем индекс для быстрого поиска по friend_id
        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)
        """))
        
        # Создаем триггер для автоматического обновления updated_at
        connection.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """))
        
        connection.execute(text("""
            DROP TRIGGER IF EXISTS update_friends_updated_at ON friends;
            CREATE TRIGGER update_friends_updated_at
                BEFORE UPDATE ON friends
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """))
        
        connection.commit()

def downgrade():
    """Удаление таблицы friends"""
    engine = create_engine(Config.DATABASE_URI)
    
    with engine.connect() as connection:
        # Удаляем триггер и функцию
        connection.execute(text("DROP TRIGGER IF EXISTS update_friends_updated_at ON friends"))
        connection.execute(text("DROP FUNCTION IF EXISTS update_updated_at_column"))
        
        # Удаляем индексы
        connection.execute(text("DROP INDEX IF EXISTS idx_friends_user_id"))
        connection.execute(text("DROP INDEX IF EXISTS idx_friends_friend_id"))
        
        # Удаляем таблицу
        connection.execute(text("DROP TABLE IF EXISTS friends"))
        
        connection.commit()

if __name__ == "__main__":
    upgrade()
    print("Миграция успешно выполнена") 