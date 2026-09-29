from django.urls import path
from .views import AuctionListCreateView, BidListCreateView, api_login_view

urlpatterns = [
    path('auctions/', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('auctions/<int:auction_id>/bids/', BidListCreateView.as_view(), name='bid-list-create'),
    path('login/', api_login_view, name='api-login'), # Connected seamlessly
]
