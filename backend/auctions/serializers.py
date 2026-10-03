from rest_framework import serializers
from .models import AuctionItem, Bid

class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source='bidder.username', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'amount', 'timestamp', 'bidder_name', 'bidder']
        read_only_fields = ['bidder', 'auction_item']

class AuctionItemSerializer(serializers.ModelSerializer):
    bids = BidSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = AuctionItem
        fields = ['id', 'title', 'description', 'category', 'image_url', 'starting_price', 'current_highest_bid', 'end_time', 'status', 'created_at', 'bids', 'seller_name', 'seller']
        read_only_fields = ['seller', 'current_highest_bid', 'status']
