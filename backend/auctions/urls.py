from django.urls import path
from .views import AuctionListCreateView, AuctionDetailView, BidListCreateView, api_login_view, api_register_view, UserBidsView, api_google_login_view, api_update_role_view, api_request_otp_view, api_verify_otp_view, api_close_auction_view, api_watchlist_view, api_watchlist_remove_view, api_notifications_view, api_admin_dashboard_view, api_payment_order_view, api_payment_verify_view, api_payment_status_view, api_upload_auction_image_view, api_user_profile_view, api_request_contact_change_otp_view, api_verify_contact_change_otp_view

urlpatterns = [
    path('uploads/auction-image/', api_upload_auction_image_view, name='auction-image-upload'),
    path('auctions/', AuctionListCreateView.as_view(), name='auction-list-create'),
    path('auctions/<int:pk>/', AuctionDetailView.as_view(), name='auction-detail'),
    path('auctions/<int:auction_id>/bids/', BidListCreateView.as_view(), name='bid-list-create'),
    path('auctions/<int:auction_id>/close/', api_close_auction_view, name='auction-close'),
    path('login/', api_login_view, name='api-login'), # Connected seamlessly
    path('auth/otp/request/', api_request_otp_view, name='api-request-otp'),
    path('auth/otp/verify/', api_verify_otp_view, name='api-verify-otp'),
    path('auth/google/', api_google_login_view, name='api-google-login'),
    path('register/', api_register_view, name='api-register'),
    path('users/me/bids/', UserBidsView.as_view(), name='user-bids'),
    path('users/me/profile/', api_user_profile_view, name='user-profile'),
    path('users/me/contact/request/', api_request_contact_change_otp_view, name='contact-change-request'),
    path('users/me/contact/verify/', api_verify_contact_change_otp_view, name='contact-change-verify'),
    path('users/me/watchlist/', api_watchlist_view, name='user-watchlist'),
    path('users/me/watchlist/<int:auction_id>/', api_watchlist_remove_view, name='user-watchlist-remove'),
    path('users/me/notifications/', api_notifications_view, name='user-notifications'),
    path('users/me/notifications/<int:notification_id>/', api_notifications_view, name='user-notification-read'),
    path('users/me/notifications/read-all/', api_notifications_view, name='user-notifications-read-all'),
    path('admin/dashboard/', api_admin_dashboard_view, name='admin-dashboard'),
    path('payments/orders/', api_payment_order_view, name='payment-order'),
    path('payments/verify/', api_payment_verify_view, name='payment-verify'),
    path('payments/auctions/<int:auction_id>/', api_payment_status_view, name='payment-status'),
    path('users/role/', api_update_role_view, name='update-role'),
]
