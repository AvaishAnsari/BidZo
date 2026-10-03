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

# ── AUCTION VIEWS ───────────────────────────────────────────────────────────

class AuctionListCreateView(generics.ListCreateAPIView):
    queryset = AuctionItem.objects.all().order_by('-created_at')
    serializer_class = AuctionItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


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
        return Response({
            "success": True,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            "success": False, 
            "error": "Authentication failed. Please verify your credentials."
        }, status=status.HTTP_400_BAD_REQUEST)