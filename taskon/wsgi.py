"""
WSGI config for taskon project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskon.settings')

application = get_wsgi_application()

from django.conf import settings

if not settings.DEBUG:
    from whitenoise import WhiteNoise
    from pathlib import Path

    BASE_DIR = Path(__file__).resolve().parent.parent
    application = WhiteNoise(application, root=os.path.join(BASE_DIR, 'staticfiles'))
    application.add_files(os.path.join(BASE_DIR, 'static'), prefix='static/')
