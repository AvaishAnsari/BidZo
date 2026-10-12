from rest_framework import serializers
from .models import AuctionItem, Bid, Address, UserProfile, Order, Shipment
from django.contrib.auth.models import User

class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source='bidder.username', read_only=True)
    auction_item = serializers.PrimaryKeyRelatedField(read_only=True)
    auction_title = serializers.CharField(source='auction_item.title', read_only=True)
    auction_image_url = serializers.CharField(source='auction_item.image_url', read_only=True)
    auction_end_time = serializers.DateTimeField(source='auction_item.end_time', read_only=True)
    auction_status = serializers.SerializerMethodField()
    auction_current_highest_bid = serializers.DecimalField(
        source='auction_item.current_highest_bid', max_digits=10, decimal_places=2, read_only=True
    )

    def get_auction_status(self, obj):
        return obj.auction_item.get_current_status()

    class Meta:
        model = Bid
        fields = [
            'id', 'amount', 'timestamp', 'bidder_name', 'bidder', 'auction_item',
            'auction_title', 'auction_image_url', 'auction_end_time',
            'auction_status', 'auction_current_highest_bid',
        ]
        read_only_fields = ['bidder']

class AuctionItemSerializer(serializers.ModelSerializer):
    bid_count = serializers.IntegerField(source='bids.count', read_only=True)
    current_price = serializers.DecimalField(source='current_highest_bid', max_digits=10, decimal_places=2, read_only=True)
    bids = BidSerializer(many=True, read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    images = serializers.ListField(child=serializers.CharField(), required=False)

    status = serializers.SerializerMethodField()

    def get_status(self, obj):
        return obj.get_current_status()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        imgs = data.get('images') or []
        if not imgs and instance.image_url:
            data['images'] = [instance.image_url]
        return data

    def create(self, validated_data):
        images = validated_data.get('images', [])
        image_url = validated_data.get('image_url')
        if images and not image_url:
            validated_data['image_url'] = images[0]
        elif image_url and not images:
            validated_data['images'] = [image_url]
        return super().create(validated_data)

    class Meta:
        model = AuctionItem
        fields = ['id', 'title', 'description', 'category', 'image_url', 'images', 'starting_price', 'current_highest_bid', 'end_time', 'status', 'moderation_status', 'moderation_notes', 'created_at', 'bids', 'seller_name', 'seller', 'bid_count', 'current_price']
        read_only_fields = ['seller', 'current_highest_bid', 'status', 'moderation_status', 'moderation_notes']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'full_name', 'address_line_1', 'address_line_2',
            'city', 'state', 'postal_code', 'country', 'phone',
            'address_type', 'is_default', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    total_bids = serializers.SerializerMethodField()
    total_addresses = serializers.SerializerMethodField()

    def get_total_bids(self, obj):
        return obj.user.placed_bids.count()

    def get_total_addresses(self, obj):
        return obj.user.addresses.count()

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        # Update User model fields
        user = instance.user
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        user.save()
        # Update UserProfile fields
        instance.phone = validated_data.get('phone', instance.phone)
        instance.avatar_url = validated_data.get('avatar_url', instance.avatar_url)
        instance.business_name = validated_data.get('business_name', instance.business_name)
        instance.business_registration_number = validated_data.get('business_registration_number', instance.business_registration_number)

        # Allow admin updates to verification_status if provided
        if 'verification_status' in validated_data:
            instance.verification_status = validated_data['verification_status']
        # Otherwise, if they just submitted verification details and were NOT_SUBMITTED, mark PENDING
        elif instance.business_name and instance.business_registration_number and instance.verification_status == 'NOT_SUBMITTED':
            instance.verification_status = 'PENDING'

        instance.save()
        return instance

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'avatar_url', 'total_bids', 'total_addresses',
            'verification_status', 'business_name', 'business_registration_number'
        ]
        read_only_fields = ['id', 'username', 'email', 'role', 'total_bids', 'total_addresses', 'verification_status']


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = [
            'id', 'order', 'status', 'courier_name', 'tracking_number',
            'created_at', 'dispatched_at', 'delivered_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order', 'created_at', 'dispatched_at', 'delivered_at', 'updated_at'
        ]

class OrderSerializer(serializers.ModelSerializer):
    auction_title = serializers.CharField(source='auction.title', read_only=True)
    auction_image_url = serializers.CharField(source='auction.image_url', read_only=True)
    buyer_name = serializers.CharField(source='buyer.username', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    shipment = ShipmentSerializer(read_only=True)
    delivery_address_details = AddressSerializer(source='delivery_address', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'auction', 'auction_title', 'auction_image_url', 'winning_bid',
            'buyer', 'buyer_name', 'seller', 'seller_name', 'winning_amount',
            'shipping_charge', 'total_amount', 'payment_status', 'order_status',
            'razorpay_order_id', 'created_at', 'updated_at', 'delivery_address',
            'delivery_address_details', 'shipment'
        ]
        read_only_fields = [
            'id', 'auction', 'winning_bid', 'buyer', 'seller', 'winning_amount',
            'shipping_charge', 'total_amount', 'payment_status', 'order_status',
            'razorpay_order_id', 'created_at', 'updated_at', 'shipment'
        ]

class AdminUserProfileSerializer(UserProfileSerializer):
    class Meta(UserProfileSerializer.Meta):
        read_only_fields = ['id', 'username', 'email', 'role', 'total_bids', 'total_addresses']

class AdminAuctionItemSerializer(AuctionItemSerializer):
    class Meta(AuctionItemSerializer.Meta):
        read_only_fields = ['seller', 'current_highest_bid', 'status']
