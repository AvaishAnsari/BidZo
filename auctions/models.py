from django.db import models
from django.contrib.auth.models import User

class AuctionItem(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    starting_price = models.DecimalField(max_digits=10, decimal_places=2)
    current_highest_bid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    end_time = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Links each auction to a user profile
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auctions')

    def __str__(self):
        return self.title

class Bid(models.Model):
    auction_item = models.ForeignKey(AuctionItem, on_delete=models.CASCADE, related_name='bids')
    bidder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='placed_bids')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-amount'] # Orders bids automatically so highest is always first

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

@receiver(post_save, sender=Bid)
def update_auction_highest_bid(sender, instance, created, **kwargs):
    """
    Signal handler: Whenever a bid object is saved, it automatically updates 
    the related AuctionItem's highest bid metric counter.
    """
    if created:
        auction = instance.auction_item
        auction.current_highest_bid = instance.amount
        
        # If the auction timeline has already run out, mark it as completed
        if auction.end_time < timezone.now():
            auction.status = 'completed'
            
        auction.save()
