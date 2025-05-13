from django.apps import AppConfig


class TaskonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'taskon'

    def ready(self):
        """
        Инициализация данных при запуске приложения.
        """
        import sys
        import os
        
        if len(sys.argv) > 1:
            commands_to_skip = ['makemigrations', 'migrate', 'collectstatic', 'check', 
                              'compilemessages', 'createcachetable', 'dbshell', 'diffsettings',
                              'dumpdata', 'flush', 'inspectdb', 'loaddata', 'showmigrations']
            if sys.argv[1] in commands_to_skip:
                return
        
        def initialize_roles():
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
        
        from django.db.models.signals import post_migrate
        from django.dispatch import receiver
        
        @receiver(post_migrate)
        def on_post_migrate(sender, **kwargs):
            if sender.name == self.name:
                initialize_roles()
