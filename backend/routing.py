from django.urls import path

from auctions.consumers import AuctionConsumer


websocket_urlpatterns = [
    path('ws/auctions/', AuctionConsumer.as_asgi(), name='auction-live-updates'),
    path('ws/auctions/<int:auction_id>/', AuctionConsumer.as_asgi(), name='auction-live-updates-detail'),
]
