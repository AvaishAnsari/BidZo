from django.urls import path
from .views import AuctionListCreateView, BidListCreateView, api_login_view, api_register_view, UserBidsView, api_google_login_view, api_update_role_view

urlpatterns = [
    path('auctions/', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('auctions/<int:auction_id>/bids/', BidListCreateView.as_view(), name='bid-list-create'),
    path('login/', api_login_view, name='api-login'), # Connected seamlessly
    path('auth/google/', api_google_login_view, name='api-google-login'),
    path('register/', api_register_view, name='api-register'),
    path('users/me/bids/', UserBidsView.as_view(), name='user-bids'),
    path('users/role/', api_update_role_view, name='update-role'),
]
