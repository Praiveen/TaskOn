# TaskOn

Платформа для управления встречами и событиями.

## Настройка окружения

### Локальная разработка

1. Клонируйте репозиторий

2. Создайте и активируйте виртуальное окружение:
   ```
   python -m venv venv
   source venv/bin/activate  # для Linux/Mac
   venv\Scripts\activate     # для Windows
   ```

3. Установите зависимости:
   ```
   pip install -r requirements.txt
   ```

4. В файле `taskon/settings.py` убедитесь, что `DEBUG = True` для локальной разработки

5. Настройте локальную базу данных PostgreSQL в блоке `DATABASES`

6. Выполните миграции:
   ```
   python manage.py makemigrations
   python manage.py migrate
   ```

7. Запустите сервер разработки:
   ```
   python manage.py runserver
   ```

### Продакшен (Render)

1. В файле `taskon/settings.py` убедитесь, что `DEBUG = False` для продакшен-среды

2. Добавьте необходимые переменные окружения в Render:
   - `DATABASE_NAME`
   - `DATABASE_USER`
   - `DATABASE_PASSWORD`
   - `DATABASE_HOST`
   - `DATABASE_PORT`
   - `SITE_URL`

3. При деплое на Render указывайте команду запуска:
   ```
   gunicorn taskon.wsgi:application
   ```
