from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = "api"

    def ready(self):
        # Registers OpenApiAuthenticationExtension subclasses for drf-spectacular.
        from . import spectacular_extensions  # noqa: F401
