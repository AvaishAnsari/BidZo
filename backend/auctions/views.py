# auctions/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
import datetime
import os
import uuid
from .models import AuctionItem, Bid, Address, UserProfile, Order, Shipment
from .serializers import AuctionItemSerializer, BidSerializer, AddressSerializer, UserProfileSerializer, OrderSerializer, ShipmentSerializer
from .payment_service import PaymentService
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests

class AuthAnonRateThrottle(AnonRateThrottle):
    rate = '10/minute'

def verify_recaptcha_v3(token, expected_action):
    recaptcha_secret = getattr(settings, 'RECAPTCHA_SECRET_KEY', '')
    bypass_in_dev = getattr(settings, 'RECAPTCHA_BYPASS_IN_DEV', False)
    min_score = getattr(settings, 'RECAPTCHA_MIN_SCORE', 0.5)

    if not recaptcha_secret or bypass_in_dev:
        return True, None

    if not token:
        return False, "Missing reCAPTCHA token."
    try:
        verify_response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={'secret': recaptcha_secret, 'response': token},
            timeout=5
        ).json()
        if not verify_response.get('success'):
            return False, "Invalid reCAPTCHA token."
        if expected_action and verify_response.get('action') != expected_action:
            return False, "reCAPTCHA action mismatch."
        if verify_response.get('score', 0) < min_score:
            return False, "reCAPTCHA score too low."
        return True, None
    except requests.exceptions.RequestException:
        return False, "Failed to verify reCAPTCHA with Google."
    except Exception:
        return False, "Internal error verifying reCAPTCHA."

# ── AUCTION VIEWS ───────────────────────────────────────────────────────────

class AuctionDetailView(generics.RetrieveAPIView):
    serializer_class = AuctionItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_url_kwarg = 'auction_id'
    lookup_field = 'id'

    def get_queryset(self):
        from django.db import models
        user = self.request.user
        qs = AuctionItem.objects.all()
        if user.is_authenticated:
            if getattr(user, 'profile', None) and user.profile.role == 'admin':
                return qs
            return qs.filter(models.Q(moderation_status='APPROVED') | models.Q(seller=user))
        return qs.filter(moderation_status='APPROVED')

class AuctionListCreateView(generics.ListCreateAPIView):
    serializer_class = AuctionItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from django.db import models
        user = self.request.user
        qs = AuctionItem.objects.all().order_by('-created_at')
        if user.is_authenticated:
            if getattr(user, 'profile', None) and user.profile.role == 'admin':
                return qs
            return qs.filter(models.Q(moderation_status='APPROVED') | models.Q(seller=user))
        return qs.filter(moderation_status='APPROVED')

    def create(self, request, *args, **kwargs):
        try:
            if request.user.profile.role != 'seller':
                return Response({"success": False, "error": "Only sellers can create auctions."}, status=status.HTTP_403_FORBIDDEN)
            if request.user.profile.verification_status != 'VERIFIED':
                return Response({"success": False, "error": "You must be verified by an admin to create auctions."}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({"success": False, "error": "User profile not found."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        auction = serializer.save(seller=self.request.user)

        def broadcast_auction():
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'auction_global',
                {'type': 'auction_message', 'message': {'type': 'AUCTION_CREATED', 'auction': serializer.data}}
            )
        transaction.on_commit(broadcast_auction)


# ── BID VIEWS ───────────────────────────────────────────────────────────────

class BidListCreateView(generics.ListCreateAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        auction_id = self.kwargs['auction_id']
        try:
            auction = AuctionItem.objects.get(id=auction_id)
            user = self.request.user
            if auction.moderation_status != 'APPROVED':
                is_authorized = user.is_authenticated and (user == auction.seller or getattr(user.profile, 'role', '') == 'admin')
                if not is_authorized:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Cannot view bids for an unapproved auction.")
        except AuctionItem.DoesNotExist:
            pass
        return Bid.objects.filter(auction_item_id=auction_id).order_by('-amount')

    def create(self, request, *args, **kwargs):
        # Allow any authenticated user (buyers and sellers) to bid.
        # Seller self-bidding restriction is handled after loading the auction.
        pass

        try:
            auction_id = self.kwargs['auction_id']
            amount = float(request.data.get('amount', 0))
            recaptcha_token = request.data.get('recaptcha_token', '')
        except (ValueError, TypeError):
            return Response({"success": False, "error": "Invalid bid amount format."}, status=status.HTTP_400_BAD_REQUEST)

        # RECAPTCHA VALIDATION
        is_valid, error_msg = verify_recaptcha_v3(recaptcha_token, expected_action='bid')
        if not is_valid:
            return Response({"success": False, "error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # ─── CONCURRENCY SAFETY & VALIDATION BLOCK ───
        with transaction.atomic():
            try:
                # Lock the specific auction row in PostgreSQL to prevent race conditions
                auction = AuctionItem.objects.select_for_update().get(id=auction_id)
            except AuctionItem.DoesNotExist:
                return Response({"success": False, "error": "Auction item not found."}, status=status.HTTP_404_NOT_FOUND)

            # 1. Prevent seller from bidding on their own auction
            if auction.seller == request.user:
                return Response({"success": False, "error": "You cannot bid on your own auction."}, status=status.HTTP_403_FORBIDDEN)

            if auction.moderation_status != 'APPROVED':
                return Response({"success": False, "error": "Cannot bid on an unapproved auction."}, status=status.HTTP_403_FORBIDDEN)

            # 2. Check if the auction has already closed
            if auction.end_time < timezone.now():
                return Response({"success": False, "error": "This auction has already ended."}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Check if the new bid is higher than the current highest bid
            if amount <= float(auction.current_highest_bid):
                return Response({
                    "success": False,
                    "error": f"Bid must be higher than the current highest bid of {auction.current_highest_bid}."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update the auction price atomically
            auction.current_highest_bid = amount
            auction.save()

            # Save the bid via serializer
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(bidder=self.request.user, auction_item=auction)

            # Broadcast to WebSocket group
            def broadcast_bid():
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'auction_{auction_id}',
                    {
                        'type': 'auction_message',
                        'message': {
                            'type': 'BID_PLACED',
                            'auction_id': int(auction_id),
                            'bid': serializer.data,
                            'current_highest_bid': amount,
                        }
                    }
                )

            transaction.on_commit(broadcast_bid)

        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)


# ── AUTHENTICATION VIEWS (JWT ENHANCED) ─────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def api_login_view(request):
    recaptcha_token = request.data.get('recaptcha_token', '')
    is_valid, error_msg = verify_recaptcha_v3(recaptcha_token, expected_action='login')
    if not is_valid:
        return Response({"success": False, "error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

    identifier = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')

    username = identifier

    if identifier and '@' in identifier:
        user_obj = User.objects.filter(email=identifier).first()
        if user_obj:
            username = user_obj.username

    user = authenticate(username=username, password=password)

    if user is not None:
        # Generate JWT tokens so frontend can authenticate subsequent requests
        refresh = RefreshToken.for_user(user)

        # Ensure profile exists before accessing to be safe
        role = 'buyer'
        try:
            role = user.profile.role
        except Exception:
            pass

        return Response({
            "success": True,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            "success": False,
            "error": "Authentication failed. Please verify your credentials."
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_google_login_view(request):
    token = request.data.get('token')
    if not token:
        return Response({"success": False, "error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verify the token against Google
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH2_CLIENT_ID,
            clock_skew_in_seconds=10
        )

        email = idinfo.get('email')
        name = idinfo.get('name') or email.split('@')[0]

        if not email:
            return Response({"success": False, "error": "Email not provided by Google"}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(username=email, defaults={'email': email})

        if created:
            # Set unusable password for Google users
            user.set_unusable_password()
            user.save()

        # UserProfile with 'buyer' role is automatically created by the post_save signal in models.py

        refresh = RefreshToken.for_user(user)
        role = 'buyer'
        try:
            role = user.profile.role
        except Exception:
            pass

        return Response({
            "success": True,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role
            },
            "is_new_user": created
        }, status=status.HTTP_200_OK)

    except ValueError as e:
        # Invalid token
        return Response({"success": False, "error": "Invalid Google token"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"success": False, "error": "Authentication error: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def api_register_view(request):
    recaptcha_token = request.data.get('recaptcha_token', '')
    is_valid, error_msg = verify_recaptcha_v3(recaptcha_token, expected_action='register')
    if not is_valid:
        return Response({"success": False, "error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    role = request.data.get('role', 'buyer')

    if not username or not email or not password:
        return Response({
            "success": False,
            "error": "Username, email, and password are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({
            "success": False,
            "error": "This username is already taken."
        }, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({
            "success": False,
            "error": "This email is already in use."
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)

        # The post_save signal created the profile with default 'buyer' role.
        # We need to fetch it explicitly to update it, as the reverse relation isn't cached yet.
        profile = user.profile
        if role in ['buyer', 'seller']:
            profile.role = role
            profile.save()

        return Response({
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.profile.role
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_update_role_view(request):
    role = request.data.get('role')
    if role not in ['buyer', 'seller']:
        return Response({"success": False, "error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    try:
        profile = user.profile
        profile.role = role
        profile.save()
        return Response({"success": True, "role": role}, status=status.HTTP_200_OK)
    except Exception:
        return Response({"success": False, "error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

class UserBidsView(generics.ListAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bid.objects.filter(bidder=self.request.user).order_by('-timestamp').select_related('auction_item')


# ── USER PROFILE VIEW ──────────────────────────────────────────────────────────

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


# ── ADDRESS VIEWS ──────────────────────────────────────────────────────────────

class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return addresses belonging to the authenticated user (no IDOR)
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Derive user from request — never trust user_id from request body
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scope to authenticated user only — prevents IDOR
        return Address.objects.filter(user=self.request.user)

    def get_object(self):
        try:
            obj = self.get_queryset().get(pk=self.kwargs['address_id'])
            return obj
        except Address.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Address not found.")

# ── ORDER & PAYMENT VIEWS ──────────────────────────────────────────────────

class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        return Order.objects.filter(Q(buyer=self.request.user) | Q(seller=self.request.user)).order_by('-created_at')

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        from django.db.models import Q
        return Order.objects.filter(Q(buyer=self.request.user) | Q(seller=self.request.user))

class AuctionOrderCreateView(generics.CreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        auction_id = self.kwargs['auction_id']
        address_id = request.data.get('delivery_address_id')

        with transaction.atomic():
            if not address_id:
                return Response({"success": False, "error": "delivery_address_id is required."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                delivery_address = Address.objects.get(id=address_id, user=request.user)
            except Address.DoesNotExist:
                return Response({"success": False, "error": "Invalid delivery address."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                auction = AuctionItem.objects.select_for_update().get(id=auction_id)
            except AuctionItem.DoesNotExist:
                return Response({"success": False, "error": "Auction not found."}, status=status.HTTP_404_NOT_FOUND)

            if auction.get_current_status() != 'ended':
                return Response({"success": False, "error": "Auction has not ended yet."}, status=status.HTTP_400_BAD_REQUEST)

            if auction.moderation_status != 'APPROVED':
                return Response({"success": False, "error": "Cannot create an order for an unapproved auction."}, status=status.HTTP_403_FORBIDDEN)

            winner = auction.winner

            if not winner:
                return Response({"success": False, "error": "Auction ended with no winner."}, status=status.HTTP_400_BAD_REQUEST)

            if winner != request.user:
                return Response({"success": False, "error": "Only the auction winner can create an order."}, status=status.HTTP_403_FORBIDDEN)

            if hasattr(auction, 'order'):
                return Response({"success": False, "error": "Order already exists for this auction."}, status=status.HTTP_400_BAD_REQUEST)

            winning_bid = auction.bids.first()

            from decimal import Decimal
            from .shipping_service import ShippingService
            shipping_charge = ShippingService.calculate_shipping_charge(delivery_address)

            order = Order.objects.create(
                auction=auction,
                winning_bid=winning_bid,
                buyer=winner,
                seller=auction.seller,
                delivery_address=delivery_address,
                winning_amount=winning_bid.amount,
                shipping_charge=shipping_charge,
                payment_status='PENDING',
                order_status='AWAITING_PAYMENT'
            )

            try:
                rp_order_id = PaymentService.create_payment_order(order.id, order.total_amount)
                order.razorpay_order_id = rp_order_id
                order.save(update_fields=['razorpay_order_id'])
            except Exception as e:
                # Log the error but allow order creation to succeed without a payment session
                print(f"Razorpay order creation failed: {e}")

            serializer = self.get_serializer(order)
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)

class PaymentVerificationView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        order_id = self.kwargs['order_id']
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')

        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(id=order_id, buyer=request.user)
            except Order.DoesNotExist:
                return Response({"success": False, "error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

            if order.payment_status == 'PAID':
                return Response({"success": False, "error": "Order is already paid."}, status=status.HTTP_400_BAD_REQUEST)

            if order.razorpay_order_id != razorpay_order_id:
                return Response({"success": False, "error": "Order ID mismatch."}, status=status.HTTP_400_BAD_REQUEST)

            is_valid = PaymentService.verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
            if is_valid:
                order.payment_status = 'PAID'
                order.order_status = 'PROCESSING'
                order.razorpay_payment_id = razorpay_payment_id
                order.razorpay_signature = razorpay_signature
                order.save()

                from .models import Shipment
                Shipment.objects.get_or_create(order=order, defaults={'status': 'READY_TO_SHIP'})

                return Response({"success": True, "message": "Payment verified successfully."})
            else:
                order.payment_status = 'FAILED'
                order.save(update_fields=['payment_status'])
                return Response({"success": False, "error": "Invalid payment signature."}, status=status.HTTP_400_BAD_REQUEST)

class RazorpayWebhookView(generics.GenericAPIView):
    permission_classes = [] # Webhooks don't use our JWT auth

    def post(self, request, *args, **kwargs):
        signature = request.headers.get('X-Razorpay-Signature')
        if not signature:
            return Response({"error": "Missing signature"}, status=status.HTTP_400_BAD_REQUEST)

        is_valid = PaymentService.verify_webhook_signature(request.body, signature)
        if not is_valid:
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        event = request.data.get('event')
        if event == 'order.paid':
            payload = request.data.get('payload', {}).get('order', {}).get('entity', {})
            razorpay_order_id = payload.get('id')
            if razorpay_order_id:
                try:
                    with transaction.atomic():
                        order = Order.objects.select_for_update().get(razorpay_order_id=razorpay_order_id)
                        if order.payment_status != 'PAID':
                            order.payment_status = 'PAID'
                            order.order_status = 'PROCESSING'
                            order.save()
                            from .models import Shipment
                            Shipment.objects.get_or_create(order=order, defaults={'status': 'READY_TO_SHIP'})
                except Order.DoesNotExist:
                    pass # Or log it. We must return 200 to Razorpay.

        return Response({"status": "ok"})

class ShipmentUpdateView(generics.UpdateAPIView):
    serializer_class = ShipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Shipment.objects.all()
    lookup_field = 'id'

    def get_queryset(self):
        # Only sellers can update shipments for their sales
        return Shipment.objects.filter(order__seller=self.request.user)

    def update(self, request, *args, **kwargs):
        shipment = self.get_object()

        # Prevent buyers from updating
        if shipment.order.buyer == request.user and shipment.order.seller != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Buyers cannot update shipments.")

        serializer = self.get_serializer(shipment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Optional: track dispatched_at / delivered_at based on status
        new_status = serializer.validated_data.get('status', shipment.status)
        from django.utils import timezone

        if new_status == 'SHIPPED' and not shipment.dispatched_at:
            serializer.validated_data['dispatched_at'] = timezone.now()
        if new_status == 'DELIVERED' and not shipment.delivered_at:
            serializer.validated_data['delivered_at'] = timezone.now()

        self.perform_update(serializer)
        return Response(serializer.data)


# ── ADMIN MODERATION VIEWS ───────────────────────────────────────────────────

class AdminSellerVerificationView(generics.UpdateAPIView):
    from .serializers import AdminUserProfileSerializer
    serializer_class = AdminUserProfileSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        from django.db.models import Q
        lookup = self.kwargs['user_id']
        try:
            return UserProfile.objects.get(Q(user__id=lookup) | Q(id=lookup))
        except UserProfile.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("User profile not found")

    def perform_update(self, serializer):
        old_status = self.get_object().verification_status
        instance = serializer.save()

        # Policy: If a seller's verification is revoked or rejected, suspend their listings.
        if old_status == 'VERIFIED' and instance.verification_status != 'VERIFIED':
            AuctionItem.objects.filter(
                seller=instance.user,
                moderation_status__in=['APPROVED', 'PENDING_REVIEW']
            ).update(
                moderation_status='REJECTED',
                moderation_notes='Automatically rejected due to seller verification revocation.'
            )


class AdminAuctionModerationView(generics.UpdateAPIView):
    from .serializers import AdminAuctionItemSerializer
    serializer_class = AdminAuctionItemSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'id'
    lookup_url_kwarg = 'auction_id'
    queryset = AuctionItem.objects.all()

class AdminPendingSellersView(generics.ListAPIView):
    from .serializers import AdminUserProfileSerializer
    serializer_class = AdminUserProfileSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        from django.db.models import Q
        return UserProfile.objects.filter(
            Q(verification_status='PENDING') | (Q(role='seller') & ~Q(verification_status='VERIFIED'))
        ).order_by('-user__date_joined')

class AdminPendingAuctionsView(generics.ListAPIView):
    from .serializers import AdminAuctionItemSerializer
    serializer_class = AdminAuctionItemSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return AuctionItem.objects.filter(moderation_status='PENDING_REVIEW').order_by('-created_at')


from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

class FileUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        files = request.FILES.getlist('images') or request.FILES.getlist('files')
        if not files:
            single_file = request.FILES.get('image') or request.FILES.get('file')
            if single_file:
                files = [single_file]

        if not files:
            return Response({"success": False, "error": "No files provided for upload."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}
        max_size = 10 * 1024 * 1024  # 10 MB

        upload_dir = os.path.join(settings.MEDIA_ROOT, 'auctions')
        os.makedirs(upload_dir, exist_ok=True)

        urls = []
        for f in files:
            ext = os.path.splitext(f.name)[1].lower()
            if ext not in allowed_extensions:
                return Response({
                    "success": False,
                    "error": f"Invalid file format for {f.name}. Supported formats: JPG, PNG, WEBP, GIF."
                }, status=status.HTTP_400_BAD_REQUEST)

            if f.size > max_size:
                return Response({
                    "success": False,
                    "error": f"File {f.name} exceeds maximum allowed size of 10MB."
                }, status=status.HTTP_400_BAD_REQUEST)

            unique_filename = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(upload_dir, unique_filename)

            with open(file_path, 'wb+') as destination:
                for chunk in f.chunks():
                    destination.write(chunk)

            file_url = request.build_absolute_uri(f"{settings.MEDIA_URL}auctions/{unique_filename}")
            urls.append(file_url)

        return Response({
            "success": True,
            "urls": urls,
            "url": urls[0] if urls else ""
        }, status=status.HTTP_201_CREATED)
