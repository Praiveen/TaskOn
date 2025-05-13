from django.apps import AppConfig


class TaskonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'taskon'

    def ready(self):
        """
        Инициализация данных при запуске приложения.
        Аналог RoleInitializer.java
        """

        import sys

        if 'makemigrations' in sys.argv or 'migrate' in sys.argv:
            return

        from .models import Role
        print("Initializing roles...")

        try:

            for role_name, role_description in Role.ROLE_DESCRIPTIONS.items():
                Role.objects.get_or_create(
                    name=role_name,
                    defaults={'description': role_description}
                )

            print("Roles initialized.")
        except Exception as e:
            print(f"Ошибка при инициализации ролей: {e}")
