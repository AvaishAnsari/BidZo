from django.urls import path, re_path, include
from django.conf import settings
from django.views.static import serve
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        "status": "online",
        "service": "BidZo Backend API",
        "endpoints": {
            "auctions": "/api/auctions/",
            "login": "/api/login/",
            "register": "/api/register/"
        }
    })

urlpatterns = [
    path('', health_check, name='health-check'),
    path('api/', include('auctions.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

