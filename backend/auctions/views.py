# auctions/views.py
import hmac
import hashlib
import re
import secrets
import uuid
from decimal import Decimal
from datetime import timedelta

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.core import signing
from django.utils.crypto import constant_time_compare
import requests
import datetime
from .models import AuctionItem, AuctionPayment, Bid, Notification, OneTimeCode, UserProfile, WatchlistItem
from .serializers import AuctionItemSerializer, BidSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .permissions import IsAuthenticatedOrReadOnly


def verify_recaptcha(token, expected_action):
    secret = getattr(settings, 'RECAPTCHA_SECRET_KEY', '')
    if not secret:
        return bool(settings.DEBUG)
    if not token:
        return False
    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={'secret': secret, 'response': token},
            timeout=5,
        )
        result = response.json()
        return bool(
            response.ok and result.get('success')
            and result.get('action') == expected_action
            and float(result.get('score', 0)) >= 0.5
        )
    except (requests.RequestException, ValueError, TypeError):
        return False

# ── AUCTION VIEWS ───────────────────────────────────────────────────────────

class AuctionListCreateView(generics.ListCreateAPIView):
    queryset = AuctionItem.objects.all().order_by('-created_at')
    serializer_class = AuctionItemSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        auction = serializer.save(seller=self.request.user)

        def broadcast_auction():
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'auction_global',
                {
                    'type': 'auction_message',
                    'message': {
                        'type': 'AUCTION_CREATED',
                        'auction': serializer.data
                    }
                }
            )
        transaction.on_commit(broadcast_auction)


class AuctionDetailView(generics.RetrieveAPIView):
    queryset = AuctionItem.objects.select_related('seller').prefetch_related('bids')
    serializer_class = AuctionItemSerializer
    permission_classes = [permissions.AllowAny]


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def api_upload_auction_image_view(request):
    """Store an auction image and return its public URL for the listing form."""
    uploaded = request.FILES.get('image')
    if not uploaded:
        return Response({'error': 'Choose an image to upload.'}, status=status.HTTP_400_BAD_REQUEST)

    allowed_types = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
    extension = ('.' + uploaded.name.rsplit('.', 1)[-1].lower()) if '.' in uploaded.name else ''
    if uploaded.content_type not in allowed_types or extension not in allowed_extensions:
        return Response({'error': 'Use a JPG, PNG, WEBP, or GIF image.'}, status=status.HTTP_400_BAD_REQUEST)
    if uploaded.size > 5 * 1024 * 1024:
        return Response({'error': 'Image must be 5 MB or smaller.'}, status=status.HTTP_400_BAD_REQUEST)

    stored_name = default_storage.save(f'auction_images/{uuid.uuid4().hex}{extension}', uploaded)
    return Response({'image_url': request.build_absolute_uri(settings.MEDIA_URL + stored_name)}, status=status.HTTP_201_CREATED)


# ── BID VIEWS ───────────────────────────────────────────────────────────────

class BidListCreateView(generics.ListCreateAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Bid.objects.filter(auction_item_id=self.kwargs['auction_id']).order_by('-amount')

    def create(self, request, *args, **kwargs):
        if not verify_recaptcha(request.data.get('recaptcha_token'), 'place_bid'):
            return Response({'success': False, 'error': 'Security verification failed. Please retry.'}, status=status.HTTP_400_BAD_REQUEST)
        auction_id = self.kwargs['auction_id']
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']

        # ─── CONCURRENCY SAFETY & VALIDATION BLOCK ───
        with transaction.atomic():
            try:
                # Lock the specific auction row in PostgreSQL to prevent race conditions
                auction = AuctionItem.objects.select_for_update().get(id=auction_id)
            except AuctionItem.DoesNotExist:
                return Response({"success": False, "error": "Auction item not found."}, status=status.HTTP_404_NOT_FOUND)

            # 1. The owner cannot bid on their own auction.
            if auction.seller_id == request.user.id:
                return Response({"success": False, "error": "Auction owners cannot bid on their own auctions."}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Only active auctions that have not passed their end time accept bids.
            if auction.status != 'active' or auction.end_time <= timezone.now():
                return Response({"success": False, "error": "This auction has already ended."}, status=status.HTTP_400_BAD_REQUEST)

            # 3. The first bid must exceed the starting price; later bids must
            # exceed the current highest bid. Keep the comparison in Decimal.
            recorded_highest = Bid.objects.filter(auction_item=auction).order_by('-amount').values_list('amount', flat=True).first()
            previous_bid = Bid.objects.filter(auction_item=auction).select_related('bidder').order_by('-amount', 'timestamp').first()
            current_price = max(auction.starting_price, auction.current_highest_bid, recorded_highest or Decimal('0.00'))
            minimum_bid = current_price + auction.min_increment
            if amount < minimum_bid:
                return Response({
                    "success": False,
                    "error": f"Bid must be at least {minimum_bid} (current price plus the minimum increment)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # The Bid post-save signal updates the auction price in this transaction.
            serializer.save(bidder=self.request.user, auction_item=auction)
            Notification.objects.create(
                user=auction.seller,
                auction=auction,
                type='bid_update',
                title='New bid on your auction',
                message=f'{request.user.username} placed a bid of {amount} on {auction.title}.',
            )
            if previous_bid and previous_bid.bidder_id != request.user.id:
                Notification.objects.create(
                    user=previous_bid.bidder,
                    auction=auction,
                    type='outbid',
                    title='You have been outbid',
                    message=f'A higher bid was placed on {auction.title}.',
                )

            # Broadcast to WebSocket group
            def broadcast_bid():
                channel_layer = get_channel_layer()
                event = {
                    'type': 'auction_message',
                    'message': {
                        'type': 'BID_PLACED',
                        'auction_id': int(auction_id),
                        'bid': serializer.data,
                        'current_highest_bid': str(amount),
                    }
                }
                async_to_sync(channel_layer.group_send)(f'auction_{auction_id}', event)
                async_to_sync(channel_layer.group_send)('auction_global', event)

            transaction.on_commit(broadcast_bid)

        return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_close_auction_view(request, auction_id):
    """Mark an expired auction complete; only its seller or an admin can settle it."""
    with transaction.atomic():
        auction = AuctionItem.objects.select_for_update().filter(pk=auction_id).first()
        if auction is None:
            return Response({"success": False, "error": "Auction item not found."}, status=status.HTTP_404_NOT_FOUND)
        if auction.seller_id != request.user.id and not request.user.is_staff:
            return Response({"success": False, "error": "Only the seller or an admin can close this auction."}, status=status.HTTP_403_FORBIDDEN)
        if auction.end_time > timezone.now():
            return Response({"success": False, "error": "This auction has not ended yet."}, status=status.HTTP_400_BAD_REQUEST)

        if auction.status != 'completed':
            auction.status = 'completed'
            auction.save(update_fields=['status'])

        winning_bid = Bid.objects.filter(auction_item=auction).order_by('-amount', 'timestamp').first()
        if winning_bid:
            Notification.objects.get_or_create(
                user=winning_bid.bidder,
                auction=auction,
                type='system',
                title='Auction ended — you won',
                defaults={'message': f'You won {auction.title}. Payment is now available.'},
            )
        return Response({
            "success": True,
            "status": "completed",
            "winner_id": winning_bid.bidder_id if winning_bid else None,
        }, status=status.HTTP_200_OK)


# ── AUTHENTICATION VIEWS (JWT ENHANCED) ─────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def api_login_view(request):
    if not verify_recaptcha(request.data.get('recaptcha_token'), 'login'):
        return Response({'success': False, 'error': 'Security verification failed. Please retry.'}, status=status.HTTP_400_BAD_REQUEST)
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
def api_request_otp_view(request):
    """Send a short-lived login code to a registered email or phone number."""
    if request.data.get('purpose', 'login') == 'login' and not verify_recaptcha(request.data.get('recaptcha_token'), 'login'):
        return Response({'success': False, 'error': 'Security verification failed. Please retry.'}, status=status.HTTP_400_BAD_REQUEST)
    identifier = (request.data.get('identifier') or '').strip()
    channel = request.data.get('channel')
    purpose = request.data.get('purpose', 'login')
    if channel not in ('email', 'sms') or purpose not in ('login', 'phone_registration') or not identifier:
        return Response({"success": False, "error": "Enter an email or mobile number."}, status=status.HTTP_400_BAD_REQUEST)

    if purpose == 'phone_registration':
        if channel != 'sms' or not re.fullmatch(r'\+[1-9]\d{7,14}', identifier):
            return Response({"success": False, "error": "Use a mobile number in international format, for example +919876543210."}, status=status.HTTP_400_BAD_REQUEST)
        if UserProfile.objects.filter(phone_number=identifier).exists():
            return Response({"success": False, "error": "This mobile number is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        user = None
    elif channel == 'email':
        try:
            validate_email(identifier)
        except ValidationError:
            return Response({"success": False, "error": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=identifier).first()
    else:
        if not re.fullmatch(r'\+[1-9]\d{7,14}', identifier):
            return Response({"success": False, "error": "Use international format, for example +919876543210."}, status=status.HTTP_400_BAD_REQUEST)
        profile = UserProfile.objects.select_related('user').filter(phone_number=identifier).first()
        user = profile.user if profile else None

    # Avoid disclosing whether an account exists.
    generic_response = {"success": True, "message": "If the account exists, a verification code has been sent."}
    if user is None and purpose == 'login':
        return Response(generic_response, status=status.HTTP_200_OK)

    now = timezone.now()
    latest = OneTimeCode.objects.filter(user=user, identifier=identifier, channel=channel, purpose=purpose).order_by('-created_at').first()
    if latest and latest.created_at > now - timedelta(seconds=60):
        return Response({"success": False, "error": "Please wait a minute before requesting another code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    code = f'{secrets.randbelow(1_000_000):06d}'
    OneTimeCode.objects.filter(user=user, identifier=identifier, channel=channel, purpose=purpose, consumed_at__isnull=True).update(consumed_at=now)
    OneTimeCode.objects.create(
        user=user,
        identifier=identifier,
        channel=channel,
        purpose=purpose,
        code_hash=make_password(code),
        expires_at=now + timedelta(minutes=5),
    )

    try:
        if channel == 'email':
            send_mail(
                'Your BidZo sign-in code',
                f'Your BidZo verification code is {code}. It expires in 5 minutes.',
                None,
                [user.email],
                fail_silently=False,
            )
        elif settings.DEBUG:
            # Free development-only delivery. Configure a real SMS gateway before production.
            print(f'[BidZo development SMS] To ending {identifier[-4:]}: sign-in code {code}')
        else:
            raise RuntimeError('SMS delivery provider is not configured.')
    except Exception:
        OneTimeCode.objects.filter(user=user, identifier=identifier, channel=channel, purpose=purpose, consumed_at__isnull=True).update(consumed_at=now)
        return Response({"success": False, "error": "Code delivery is unavailable. Check the backend email/SMS configuration."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(generic_response, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def api_verify_otp_view(request):
    if request.data.get('purpose', 'login') == 'login' and not verify_recaptcha(request.data.get('recaptcha_token'), 'login'):
        return Response({'success': False, 'error': 'Security verification failed. Please retry.'}, status=status.HTTP_400_BAD_REQUEST)
    identifier = (request.data.get('identifier') or '').strip()
    channel = request.data.get('channel')
    purpose = request.data.get('purpose', 'login')
    code = (request.data.get('code') or '').strip()
    if not identifier or channel not in ('email', 'sms') or purpose not in ('login', 'phone_registration') or not re.fullmatch(r'\d{6}', code):
        return Response({"success": False, "error": "Enter the six-digit code."}, status=status.HTTP_400_BAD_REQUEST)

    if purpose == 'phone_registration':
        if channel != 'sms' or not re.fullmatch(r'\+[1-9]\d{7,14}', identifier):
            return Response({"success": False, "error": "Use a valid international mobile number."}, status=status.HTTP_400_BAD_REQUEST)
        user = None
    elif channel == 'email':
        user = User.objects.filter(email__iexact=identifier).first()
    else:
        profile = UserProfile.objects.select_related('user').filter(phone_number=identifier).first()
        user = profile.user if profile else None

    now = timezone.now()
    challenge_filters = {
        'channel': channel,
        'consumed_at__isnull': True,
        'expires_at__gt': now,
    }
    if purpose == 'phone_registration':
        challenge_filters.update(user__isnull=True, identifier=identifier, purpose=purpose)
    else:
        challenge_filters.update(user=user, identifier=identifier, purpose=purpose)
    challenge = OneTimeCode.objects.filter(**challenge_filters).order_by('-created_at').first()

    if not challenge or challenge.attempts >= 5 or not check_password(code, challenge.code_hash):
        if challenge and challenge.attempts < 5:
            challenge.attempts += 1
            challenge.save(update_fields=['attempts'])
        return Response({"success": False, "error": "That code is invalid or expired. Request a new one and try again."}, status=status.HTTP_400_BAD_REQUEST)

    challenge.consumed_at = now
    challenge.save(update_fields=['consumed_at'])
    if purpose == 'phone_registration':
        verification_token = signing.dumps({"phone_number": identifier}, salt='bidzo-phone-registration')
        return Response({"success": True, "phone_verification_token": verification_token}, status=status.HTTP_200_OK)

    refresh = RefreshToken.for_user(user)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return Response({
        "success": True,
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": profile.role},
    }, status=status.HTTP_200_OK)

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

        if idinfo.get('email_verified') is True:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if not profile.email_verified:
                profile.email_verified = True
                profile.save(update_fields=['email_verified'])
            
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
def api_register_view(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    phone_number = (request.data.get('phone_number') or '').strip() or None
    phone_verification_token = request.data.get('phone_verification_token') or ''
    role = request.data.get('role', 'buyer')

    if not username or not email or not password:
        return Response({
            "success": False,
            "error": "Username, email, and password are required."
        }, status=status.HTTP_400_BAD_REQUEST)

    if role not in ['buyer', 'seller']:
        return Response({
            "success": False,
            "error": "Role must be either buyer or seller."
        }, status=status.HTTP_400_BAD_REQUEST)

    if not phone_number or not re.fullmatch(r'\+[1-9]\d{7,14}', phone_number):
        return Response({"success": False, "error": "A valid mobile number with country code is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        proof = signing.loads(phone_verification_token, salt='bidzo-phone-registration', max_age=600)
    except signing.BadSignature:
        return Response({"success": False, "error": "Verify your mobile number before creating the account."}, status=status.HTTP_400_BAD_REQUEST)
    if proof.get('phone_number') != phone_number:
        return Response({"success": False, "error": "The verified mobile number does not match."}, status=status.HTTP_400_BAD_REQUEST)
    if UserProfile.objects.filter(phone_number=phone_number).exists():
        return Response({"success": False, "error": "This mobile number is already in use."}, status=status.HTTP_400_BAD_REQUEST)

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
        profile.role = role
        profile.phone_number = phone_number
        profile.phone_verified = True
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


def _account_details_payload(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": profile.phone_number or "",
        "email_verified": profile.email_verified,
        "phone_verified": profile.phone_verified,
        "role": profile.role,
    }


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def api_user_profile_view(request):
    """Read or update account details that do not need contact verification."""
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'PATCH':
        username = (request.data.get('username', user.username) or '').strip()
        first_name = (request.data.get('first_name', user.first_name) or '').strip()
        last_name = (request.data.get('last_name', user.last_name) or '').strip()

        if not username or len(username) > 150:
            return Response({"success": False, "error": "Username must be between 1 and 150 characters."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            UnicodeUsernameValidator()(username)
        except ValidationError:
            return Response({"success": False, "error": "Use a valid username without spaces or special characters."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
            return Response({"success": False, "error": "That username is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        if len(first_name) > 150 or len(last_name) > 150:
            return Response({"success": False, "error": "Names must be 150 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)

        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        try:
            user.save(update_fields=['username', 'first_name', 'last_name'])
        except IntegrityError:
            return Response({"success": False, "error": "That username is already in use."}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "profile": _account_details_payload(user)}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_request_contact_change_otp_view(request):
    """Send a verification code to the new email address or phone number."""
    channel = request.data.get('channel')
    identifier = (request.data.get('identifier') or '').strip()
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if channel == 'email':
        identifier = identifier.lower()
        try:
            validate_email(identifier)
        except ValidationError:
            return Response({"success": False, "error": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=identifier).exclude(pk=user.pk).exists():
            return Response({"success": False, "error": "That email address is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        if user.email and user.email.lower() == identifier and profile.email_verified:
            return Response({"success": False, "error": "That is already your verified email address."}, status=status.HTTP_400_BAD_REQUEST)
    elif channel == 'sms':
        if not re.fullmatch(r'\+[1-9]\d{7,14}', identifier):
            return Response({"success": False, "error": "Use international format, for example +919876543210."}, status=status.HTTP_400_BAD_REQUEST)
        if UserProfile.objects.filter(phone_number=identifier).exclude(user=user).exists():
            return Response({"success": False, "error": "That mobile number is already in use."}, status=status.HTTP_400_BAD_REQUEST)
        if profile.phone_number == identifier and profile.phone_verified:
            return Response({"success": False, "error": "That is already your verified mobile number."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({"success": False, "error": "Choose email or SMS verification."}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    latest = OneTimeCode.objects.filter(
        user=user, identifier=identifier, channel=channel, purpose='contact_change'
    ).order_by('-created_at').first()
    if latest and latest.created_at > now - timedelta(seconds=60):
        return Response({"success": False, "error": "Please wait a minute before requesting another code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    code = f'{secrets.randbelow(1_000_000):06d}'
    OneTimeCode.objects.filter(
        user=user, identifier=identifier, channel=channel, purpose='contact_change', consumed_at__isnull=True
    ).update(consumed_at=now)
    OneTimeCode.objects.create(
        user=user,
        identifier=identifier,
        channel=channel,
        purpose='contact_change',
        code_hash=make_password(code),
        expires_at=now + timedelta(minutes=5),
    )

    try:
        if channel == 'email':
            send_mail(
                'Verify your BidZo email address',
                f'Your BidZo email verification code is {code}. It expires in 5 minutes.',
                None,
                [identifier],
                fail_silently=False,
            )
        elif settings.DEBUG:
            print(f'[BidZo development SMS] To ending {identifier[-4:]}: contact verification code {code}')
        else:
            raise RuntimeError('SMS delivery provider is not configured.')
    except Exception:
        OneTimeCode.objects.filter(
            user=user, identifier=identifier, channel=channel, purpose='contact_change', consumed_at__isnull=True
        ).update(consumed_at=now)
        return Response({"success": False, "error": "Code delivery is unavailable. Check the backend email/SMS configuration."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({"success": True, "message": f"A verification code was sent to the new {'email address' if channel == 'email' else 'mobile number'}."}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_verify_contact_change_otp_view(request):
    """Update a contact field only after its new destination passes OTP verification."""
    channel = request.data.get('channel')
    identifier = (request.data.get('identifier') or '').strip()
    code = (request.data.get('code') or '').strip()
    user = request.user
    if not identifier or channel not in ('email', 'sms') or not re.fullmatch(r'\d{6}', code):
        return Response({"success": False, "error": "Enter the six-digit verification code."}, status=status.HTTP_400_BAD_REQUEST)
    if channel == 'email':
        identifier = identifier.lower()
        try:
            validate_email(identifier)
        except ValidationError:
            return Response({"success": False, "error": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
    elif not re.fullmatch(r'\+[1-9]\d{7,14}', identifier):
        return Response({"success": False, "error": "Use a valid international mobile number."}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    challenge = OneTimeCode.objects.filter(
        user=user,
        identifier=identifier,
        channel=channel,
        purpose='contact_change',
        consumed_at__isnull=True,
        expires_at__gt=now,
    ).order_by('-created_at').first()
    if not challenge or challenge.attempts >= 5 or not check_password(code, challenge.code_hash):
        if challenge and challenge.attempts < 5:
            challenge.attempts += 1
            challenge.save(update_fields=['attempts'])
        return Response({"success": False, "error": "That code is invalid or expired. Request a new one and try again."}, status=status.HTTP_400_BAD_REQUEST)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if channel == 'email' and User.objects.filter(email__iexact=identifier).exclude(pk=user.pk).exists():
        return Response({"success": False, "error": "That email address is already in use."}, status=status.HTTP_400_BAD_REQUEST)
    if channel == 'sms' and UserProfile.objects.filter(phone_number=identifier).exclude(user=user).exists():
        return Response({"success": False, "error": "That mobile number is already in use."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            challenge.consumed_at = now
            challenge.save(update_fields=['consumed_at'])
            if channel == 'email':
                user.email = identifier
                user.save(update_fields=['email'])
                profile.email_verified = True
                profile.save(update_fields=['email_verified'])
            else:
                profile.phone_number = identifier
                profile.phone_verified = True
                profile.save(update_fields=['phone_number', 'phone_verified'])
    except IntegrityError:
        return Response({"success": False, "error": "That contact detail is already in use."}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "message": "Your verified contact detail was updated.", "profile": _account_details_payload(user)}, status=status.HTTP_200_OK)

class UserBidsView(generics.ListAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bid.objects.filter(bidder=self.request.user).order_by('-timestamp')


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def api_watchlist_view(request):
    if request.method == 'GET':
        ids = WatchlistItem.objects.filter(user=request.user).values_list('auction_id', flat=True)
        return Response({'auction_ids': list(ids)}, status=status.HTTP_200_OK)
    try:
        auction = AuctionItem.objects.get(pk=request.data.get('auction_id'))
    except (AuctionItem.DoesNotExist, TypeError, ValueError):
        return Response({'success': False, 'error': 'Auction not found.'}, status=status.HTTP_404_NOT_FOUND)
    _, created = WatchlistItem.objects.get_or_create(user=request.user, auction=auction)
    return Response({'success': True, 'auction_id': auction.id, 'watchlisted': True}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def api_watchlist_remove_view(request, auction_id):
    deleted, _ = WatchlistItem.objects.filter(user=request.user, auction_id=auction_id).delete()
    return Response({'success': True, 'auction_id': auction_id, 'watchlisted': False, 'removed': bool(deleted)}, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def api_notifications_view(request, notification_id=None):
    if request.method == 'GET':
        items = Notification.objects.filter(user=request.user)[:100]
        return Response([{
            'id': item.id, 'user_id': item.user_id, 'title': item.title,
            'message': item.message, 'type': item.type, 'read': item.read,
            'created_at': item.created_at, 'auction_id': item.auction_id,
        } for item in items])
    if notification_id is None:
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'success': True})
    updated = Notification.objects.filter(user=request.user, pk=notification_id).update(read=True)
    if not updated:
        return Response({'success': False, 'error': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def api_admin_dashboard_view(request):
    now = timezone.now()
    auctions = AuctionItem.objects.select_related('seller').order_by('-created_at')[:10]
    users = User.objects.select_related('profile').order_by('-date_joined')[:10]
    return Response({
        'stats': {
            'total_users': User.objects.count(),
            'active_auctions': AuctionItem.objects.filter(status='active', end_time__gt=now).count(),
            'ended_auctions': AuctionItem.objects.filter(end_time__lte=now).count(),
            'total_bids': Bid.objects.count(),
        },
        'recent_auctions': [{
            'id': a.id, 'title': a.title, 'seller': a.seller.username,
            'status': 'completed' if a.end_time <= now else a.status,
            'current_highest_bid': str(a.current_highest_bid), 'created_at': a.created_at,
        } for a in auctions],
        'recent_users': [{
            'id': u.id, 'username': u.username, 'email': u.email,
            'role': getattr(getattr(u, 'profile', None), 'role', 'buyer'),
            'date_joined': u.date_joined,
        } for u in users],
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_payment_order_view(request):
    """Create a Razorpay order only for the authenticated winner of an ended auction."""
    key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
    if not key_id or not key_secret:
        return Response({'success': False, 'error': 'Online payments are not configured on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        auction = AuctionItem.objects.get(pk=request.data.get('auction_id'))
    except (AuctionItem.DoesNotExist, TypeError, ValueError):
        return Response({'success': False, 'error': 'Auction not found.'}, status=status.HTTP_404_NOT_FOUND)
    if auction.end_time > timezone.now():
        return Response({'success': False, 'error': 'Payment is available after the auction ends.'}, status=status.HTTP_400_BAD_REQUEST)
    winning_bid = Bid.objects.filter(auction_item=auction).order_by('-amount', 'timestamp').first()
    if not winning_bid or winning_bid.bidder_id != request.user.id:
        return Response({'success': False, 'error': 'Only the winning bidder can pay for this auction.'}, status=status.HTTP_403_FORBIDDEN)
    if AuctionPayment.objects.filter(auction=auction, status='completed').exists():
        return Response({'success': False, 'error': 'This auction has already been paid.'}, status=status.HTTP_409_CONFLICT)

    amount_paise = int(winning_bid.amount * 100)
    try:
        response = requests.post(
            'https://api.razorpay.com/v1/orders',
            auth=(key_id, key_secret),
            json={'amount': amount_paise, 'currency': 'INR', 'receipt': f'bidzo-{auction.id}-{request.user.id}'[:40]},
            timeout=15,
        )
        response.raise_for_status()
        order = response.json()
    except (requests.RequestException, ValueError):
        return Response({'success': False, 'error': 'The payment provider could not create an order.'}, status=status.HTTP_502_BAD_GATEWAY)

    payment, _ = AuctionPayment.objects.update_or_create(
        razorpay_order_id=order['id'],
        defaults={'auction': auction, 'user': request.user, 'amount': winning_bid.amount, 'status': 'pending'},
    )
    return Response({
        'success': True, 'key_id': key_id, 'order_id': payment.razorpay_order_id,
        'amount': amount_paise, 'currency': 'INR', 'payment_record_id': payment.id,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def api_payment_verify_view(request):
    order_id = request.data.get('razorpay_order_id', '')
    payment_id = request.data.get('razorpay_payment_id', '')
    signature = request.data.get('razorpay_signature', '')
    payment = AuctionPayment.objects.filter(razorpay_order_id=order_id, user=request.user).first()
    if not payment or not payment_id or not signature:
        return Response({'success': False, 'error': 'Payment details are invalid.'}, status=status.HTTP_400_BAD_REQUEST)
    key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
    if not key_secret:
        return Response({'success': False, 'error': 'Online payments are not configured on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    expected = hmac.new(key_secret.encode(), f'{order_id}|{payment_id}'.encode(), hashlib.sha256).hexdigest()
    if not constant_time_compare(expected, signature):
        payment.status = 'failed'
        payment.save(update_fields=['status'])
        return Response({'success': False, 'error': 'Payment signature verification failed.'}, status=status.HTTP_400_BAD_REQUEST)
    payment.razorpay_payment_id = payment_id
    payment.status = 'completed'
    payment.save(update_fields=['razorpay_payment_id', 'status'])
    return Response({'success': True, 'payment_id': payment.id, 'status': payment.status})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_payment_status_view(request, auction_id):
    payment = AuctionPayment.objects.filter(auction_id=auction_id, user=request.user).order_by('-created_at').first()
    return Response({'status': payment.status if payment else 'unpaid'})
