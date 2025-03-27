# Инструкция по установке и запуску проекта

## 1. Установка зависимостей

1. Установите Python 3.8 или выше
2. Установите OpenSSL для Windows:
   - Скачайте OpenSSL для Windows с официального сайта: https://slproweb.com/products/Win32OpenSSL.html
   - Установите Win64 OpenSSL v3.1.1 (или новее)
   - Добавьте путь к OpenSSL в переменную PATH (обычно C:\Program Files\OpenSSL-Win64\bin)

3. Установите зависимости проекта:
```bash
pip install -r requirements.txt
```

## 2. Настройка базы данных

1. Установите PostgreSQL
2. Создайте базу данных:
```sql
CREATE DATABASE fckfshdb;
```
3. Создайте пользователя:
```sql
CREATE USER my_user WITH PASSWORD '9044';
GRANT ALL PRIVILEGES ON DATABASE fckfshdb TO my_user;
```

## 3. Настройка Cloudflare Tunnel

1. Установите Cloudflare Tunnel:
   - Скачайте cloudflared с официального сайта: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
   - Установите в C:\Program Files\Cloudflare\cloudflared.exe

2. Настройте туннель:
```bash
cloudflared tunnel login
cloudflared tunnel create fckfsh
```

## 4. Запуск проекта

1. Запустите проект:
```bash
python main.py
```

2. Откройте в браузере:
   - Локально: http://127.0.0.1:5000
   - Извне: https://fckfsh.ru 