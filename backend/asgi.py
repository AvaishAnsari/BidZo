"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/asgi/
"""

import os
import sys

# Add the backend directory to sys.path so 'auctions' can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from auctions.middleware import JWTAuthMiddlewareStack
from auctions.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
