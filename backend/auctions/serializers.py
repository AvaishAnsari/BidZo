from decimal import Decimal

from rest_framework import serializers
from django.utils import timezone
from .models import AuctionItem, Bid

class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source='bidder.username', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'amount', 'timestamp', 'bidder_name', 'bidder']
        read_only_fields = ['bidder', 'auction_item']

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError('Bid amount must be greater than zero.')
        return amount

class AuctionItemSerializer(serializers.ModelSerializer):
    bids = BidSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    current_highest_bid = serializers.SerializerMethodField()
    winner_id = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = AuctionItem
        fields = ['id', 'title', 'description', 'category', 'image_url', 'starting_price', 'min_increment', 'current_highest_bid', 'end_time', 'status', 'created_at', 'bids', 'seller_name', 'seller', 'winner_id']
        read_only_fields = ['seller', 'current_highest_bid', 'status']

    def validate_starting_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Starting price must be greater than zero.')
        return value

    def validate_min_increment(self, value):
        if value <= 0:
            raise serializers.ValidationError('Minimum bid increment must be greater than zero.')
        return value

    def validate_end_time(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('Auction end time must be in the future.')
        return value

    def get_status(self, auction):
        if auction.status == 'active' and auction.end_time <= timezone.now():
            return 'completed'
        return auction.status

    def get_current_highest_bid(self, auction):
        recorded_highest = auction.bids.order_by('-amount').values_list('amount', flat=True).first()
        return max(auction.starting_price, auction.current_highest_bid, recorded_highest or Decimal('0.00'))

    def get_winner_id(self, auction):
        winning_bid = auction.bids.order_by('-amount', 'timestamp').first()
        return winning_bid.bidder_id if winning_bid else None
