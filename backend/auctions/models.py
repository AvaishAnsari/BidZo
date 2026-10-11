from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import uuid

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('buyer', 'Buyer'),
        ('seller', 'Seller'),
        ('admin', 'Admin'),
    ]
    VERIFICATION_CHOICES = [
        ('NOT_SUBMITTED', 'Not Submitted'),
        ('PENDING', 'Pending Review'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='buyer')
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar_url = models.URLField(max_length=1000, blank=True, null=True)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='NOT_SUBMITTED')
    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_registration_number = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        role = 'admin' if instance.is_superuser else 'buyer'
        UserProfile.objects.create(user=instance, role=role)
    else:
        # Save profile if it exists, otherwise create it (handles existing users safely)
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if instance.is_superuser and profile.role != 'admin':
            profile.role = 'admin'
            profile.save()


class Address(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    full_name = models.CharField(max_length=200)
    address_line_1 = models.CharField(max_length=300)
    address_line_2 = models.CharField(max_length=300, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='India')
    phone = models.CharField(max_length=20)
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPE_CHOICES, default='home')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-is_default', '-created_at']
    def __str__(self):
        return f"{self.full_name} - {self.city} ({self.address_type})"

    def save(self, *args, **kwargs):
        # Enforce only one default address per user
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

class AuctionItem(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    MODERATION_CHOICES = [
        ('PENDING_REVIEW', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    images = models.JSONField(default=list, blank=True)
    starting_price = models.DecimalField(max_digits=10, decimal_places=2)
    current_highest_bid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    moderation_status = models.CharField(max_length=20, choices=MODERATION_CHOICES, default='PENDING_REVIEW')
    moderation_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Links each auction to a user profile
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auctions')

    def __str__(self):
        return self.title

    def get_current_status(self):
        now = timezone.now()
        if now < self.start_time:
            return 'upcoming'
        elif self.start_time <= now < self.end_time:
            return 'live'
        else:
            return 'ended'

    @property
    def winner(self):
        """
        Determines the winner of the auction if it has ended.
        Returns the User object of the winner, or None.
        """
        if self.get_current_status() != 'ended':
            return None
        # Uses Bid's default ordering to get the highest, earliest bid
        highest_bid = self.bids.first()
        if highest_bid:
            return highest_bid.bidder
        return None


class Bid(models.Model):
    auction_item = models.ForeignKey(AuctionItem, on_delete=models.CASCADE, related_name='bids')
    bidder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='placed_bids')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-amount', 'timestamp', 'id'] # Highest amount first, then earliest timestamp, then earliest ID for deterministic tie-breaking

@receiver(post_save, sender=Bid)
def update_auction_highest_bid(sender, instance, created, **kwargs):
    """
    Signal handler: Whenever a bid object is saved, it automatically updates
    the related AuctionItem's highest bid metric counter.
    """
    if created:
        auction = instance.auction_item
        # Only update if the new bid is strictly greater. This prevents race conditions
        # if signals run out of order in highly concurrent environments (though views.py locks it).
        if instance.amount > auction.current_highest_bid:
            auction.current_highest_bid = instance.amount
            auction.save(update_fields=['current_highest_bid'])

class Order(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('EXPIRED', 'Expired'),
        ('REFUNDED', 'Refunded'),
    ]
    ORDER_STATUS_CHOICES = [
        ('AWAITING_PAYMENT', 'Awaiting Payment'),
        ('PAID', 'Paid'),
        ('PROCESSING', 'Processing'),
        ('READY_TO_SHIP', 'Ready to Ship'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    auction = models.OneToOneField(AuctionItem, on_delete=models.CASCADE, related_name='order')
    winning_bid = models.OneToOneField(Bid, on_delete=models.CASCADE, related_name='order')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    delivery_address = models.ForeignKey('Address', on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_orders')

    winning_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='AWAITING_PAYMENT')

    razorpay_order_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.winning_amount + self.shipping_charge
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.id} for Auction {self.auction.title}"


class Shipment(models.Model):
    STATUS_CHOICES = [
        ('NOT_CREATED', 'Not Created'),
        ('READY_TO_SHIP', 'Ready to Ship'),
        ('SHIPPED', 'Shipped'),
        ('IN_TRANSIT', 'In Transit'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
    ]
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipment')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_CREATED')
    courier_name = models.CharField(max_length=100, blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    dispatched_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Shipment for Order {self.order.id} - {self.status}"
