from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AuctionDetailView, AuctionListCreateView, BidListCreateView,
    api_login_view, api_register_view, UserBidsView, api_google_login_view,
    api_update_role_view, UserProfileView, AddressListCreateView, AddressDetailView,
    OrderListView, OrderDetailView, AuctionOrderCreateView, PaymentVerificationView,
    ShipmentUpdateView, AdminSellerVerificationView, AdminAuctionModerationView,
    AdminPendingSellersView, AdminPendingAuctionsView, RazorpayWebhookView,
    FileUploadView, api_seed_view
)

urlpatterns = [
    path('seed/', api_seed_view, name='api-seed'),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('auctions/', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('auctions/<int:auction_id>/', AuctionDetailView.as_view(), name='auction-detail'),
    path('auctions/<int:auction_id>/bids/', BidListCreateView.as_view(), name='bid-list-create'),
    path('login/', api_login_view, name='api-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/google/', api_google_login_view, name='api-google-login'),
    path('register/', api_register_view, name='api-register'),
    path('users/me/', UserProfileView.as_view(), name='user-profile'),
    path('users/me/bids/', UserBidsView.as_view(), name='user-bids'),
    path('users/me/addresses/', AddressListCreateView.as_view(), name='user-addresses'),
    path('users/me/addresses/<int:address_id>/', AddressDetailView.as_view(), name='user-address-detail'),
    path('users/role/', api_update_role_view, name='update-role'),

    # Orders and Payments
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<uuid:id>/', OrderDetailView.as_view(), name='order-detail'),
    path('auctions/<int:auction_id>/order/', AuctionOrderCreateView.as_view(), name='auction-order-create'),
    path('orders/<uuid:order_id>/verify-payment/', PaymentVerificationView.as_view(), name='verify-payment'),
    path('webhooks/razorpay/', RazorpayWebhookView.as_view(), name='razorpay-webhook'),

    # Shipments
    path('shipments/<int:id>/', ShipmentUpdateView.as_view(), name='shipment-update'),

    # Admin Moderation
    path('admin/users/<int:user_id>/verify/', AdminSellerVerificationView.as_view(), name='admin-seller-verify'),
    path('admin/auctions/<int:auction_id>/moderate/', AdminAuctionModerationView.as_view(), name='admin-auction-moderate'),
    path('admin/users/pending/', AdminPendingSellersView.as_view(), name='admin-pending-sellers'),
    path('admin/auctions/pending/', AdminPendingAuctionsView.as_view(), name='admin-pending-auctions'),
]
