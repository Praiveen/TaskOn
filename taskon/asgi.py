"""
ASGI config for taskon project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskon.settings')

# Получаем ASGI приложение Django
django_application = get_asgi_application()

# Функция-обертка для совместимости с ASGI v3
async def application(scope, receive, send):
    if scope['type'] == 'http':
        # Обрабатываем HTTP запросы через Django
        await django_application(scope, receive, send)
    else:
        # Для других типов запросов (например, WebSocket) можно добавить обработку здесь
        raise NotImplementedError(f"Не поддерживаемый тип протокола: {scope['type']}")
