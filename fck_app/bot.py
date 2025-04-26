from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.filters import Command
import asyncio
import os
import aiohttp
import logging
from config import Config

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота с токеном
BOT_TOKEN = Config.BOT_TOKEN
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot=bot)


async def save_user_to_server(user_data):
    """Асинхронная функция для отправки данных пользователя на сервер"""
    try:
        logger.info(f"Отправляем на сервер данные: {user_data}")

        base_url = Config.PUBLIC_URL
        if not base_url:
            logger.error("PUBLIC_URL не установлен в конфигурации")
            return

        # Подготавливаем данные для отправки
        data_to_send = {
            "id": user_data["id"],
            "user": user_data  # Отправляем все данные пользователя в поле user
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                    f"{base_url}/get_user_data",
                    json=data_to_send,
                    headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    logger.info(f"Пользователь {user_data['id']} успешно сохранён")
                else:
                    error_text = await response.text()
                    logger.error(f"Ошибка сохранения пользователя {user_data['id']}: {error_text}")
    except Exception as e:
        logger.error(f"Ошибка отправки данных пользователя: {e}")


@dp.message(Command("start"))
async def start_command(message: types.Message):
    """Обработчик команды /start"""
    logger.info(f"Получена команда /start от пользователя {message.from_user.id}")
    logger.info(f"PUBLIC_URL: {Config.PUBLIC_URL}")

    try:
        # Получение данных пользователя
        user = message.from_user
        user_data = {
            "id": user.id,
            "username": user.username or "unknown",
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "language_code": user.language_code or "en",
            "photo_url": None,
            "role": "user"  # Добавил роль по умолчанию
        }

        logger.info(f"Собраны данные пользователя: {user_data}")

        try:
            # Запрос аватарки пользователя
            photos = await bot.get_user_profile_photos(user_id=user.id)
            if photos and photos.total_count > 0:
                file_id = photos.photos[0][0].file_id
                user_data["photo_url"] = file_id  # Сохраняем именно file_id
                logger.info(f"Получен file_id аватарки: {file_id}")
        except Exception as e:
            logger.error(f"Ошибка получения аватарки пользователя {user.id}: {e}")

        # Сохранение данных пользователя
        await save_user_to_server(user_data)

        # Создание и отправка клавиатуры с кнопкой Mini App
        base_url = Config.PUBLIC_URL
        if not base_url:
            raise ValueError("PUBLIC_URL не установлен в конфигурации")

        mini_app_button = InlineKeyboardButton(
            text="Открыть Mini App",
            web_app=WebAppInfo(url=f"{base_url}/app?user_id={user.id}")
        )

        keyboard = InlineKeyboardMarkup(inline_keyboard=[[mini_app_button]])

        logger.info("Отправка приветственного сообщения с кнопкой")
        await message.answer(
            f"Привет, {user.first_name}! Нажмите кнопку, чтобы открыть приложение:",
            reply_markup=keyboard
        )
        logger.info("Приветственное сообщение успешно отправлено")

    except Exception as e:
        logger.error(f"Ошибка в обработчике /start: {str(e)}", exc_info=True)
        await message.answer("Произошла ошибка. Пожалуйста, попробуйте позже.")


async def main_polling():
    """Основная функция для запуска бота"""
    try:
        logger.info("Запуск поллинга бота...")
        await dp.start_polling(bot)
    except Exception as e:
        logger.error(f"Критическая ошибка при запуске бота: {str(e)}", exc_info=True)
        raise


def run_bot():
    """Функция для запуска бота из main.py"""
    try:
        logger.info("Запуск бота...")
        asyncio.run(main_polling())
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем")
    except Exception as e:
        logger.error(f"Критическая ошибка в работе бота: {str(e)}", exc_info=True)
        raise