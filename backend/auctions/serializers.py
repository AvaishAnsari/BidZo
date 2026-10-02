from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AuctionItem, Bid

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class BidSerializer(serializers.ModelSerializer):
    bidder_username = serializers.ReadOnlyField(source='bidder.username')

    class Meta:
        model = Bid
        fields = ['id', 'auction_item', 'bidder', 'bidder_username', 'amount', 'timestamp']
        read_only_fields = ['bidder', 'auction_item']

class AuctionItemSerializer(serializers.ModelSerializer):
    bids = BidSerializer(many=True, read_only=True)
    seller_username = serializers.ReadOnlyField(source='seller.username')

    class Meta:
        model = AuctionItem
        fields = [
            'id', 'title', 'description', 'starting_price', 
            'current_highest_bid', 'end_time', 'status', 
            'seller', 'seller_username', 'bids', 'created_at'
        ]
        read_only_fields = ['seller', 'current_highest_bid', 'status']