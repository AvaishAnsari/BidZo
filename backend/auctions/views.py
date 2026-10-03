# auctions/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
import datetime
from .models import AuctionItem, Bid
from .serializers import AuctionItemSerializer, BidSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# ── AUCTION VIEWS ───────────────────────────────────────────────────────────

class AuctionListCreateView(generics.ListCreateAPIView):
    queryset = AuctionItem.objects.all().order_by('-created_at')
    serializer_class = AuctionItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

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


# ── BID VIEWS ───────────────────────────────────────────────────────────────

class BidListCreateView(generics.ListCreateAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bid.objects.filter(auction_item_id=self.kwargs['auction_id']).order_by('-amount')

    def create(self, request, *args, **kwargs):
        try:
            auction_id = self.kwargs['auction_id']
            amount = float(request.data.get('amount', 0))
        except (ValueError, TypeError):
            return Response({"success": False, "error": "Invalid bid amount format."}, status=status.HTTP_400_BAD_REQUEST)

        # ─── CONCURRENCY SAFETY & VALIDATION BLOCK ───
        with transaction.atomic():
            try:
                # Lock the specific auction row in PostgreSQL to prevent race conditions
                auction = AuctionItem.objects.select_for_update().get(id=auction_id)
            except AuctionItem.DoesNotExist:
                return Response({"success": False, "error": "Auction item not found."}, status=status.HTTP_404_NOT_FOUND)

            # 1. Check if the auction has already closed
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
def api_login_view(request):
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
def api_register_view(request):
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
        if role in ['buyer', 'seller', 'admin']:
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
        return Bid.objects.filter(bidder=self.request.user).order_by('-timestamp')