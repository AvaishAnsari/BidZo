import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from auctions.models import AuctionItem, UserProfile

def seed():
    print("Creating dummy seller account...")
    seller, created = User.objects.get_or_create(username='demo_seller', email='seller@example.com')
    if created:
        seller.set_password('demo123')
        seller.save()
        profile, _ = UserProfile.objects.get_or_create(user=seller)
        profile.role = 'seller'
        profile.save()

    auctions = [
        {
            "title": "1969 Ford Mustang Boss 429",
            "description": "Mint condition classic muscle car. Fully restored original parts.",
            "category": "Vehicles",
            "image_url": "https://images.unsplash.com/photo-1549429432-d17e57303e91?auto=format&fit=crop&q=80",
            "starting_price": 45000.00,
            "end_time": timezone.now() + timedelta(days=2),
        },
        {
            "title": "Rolex Submariner Date",
            "description": "Oyster, 41 mm, Oystersteel and yellow gold. Never worn.",
            "category": "Watches",
            "image_url": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80",
            "starting_price": 12500.00,
            "end_time": timezone.now() + timedelta(days=1),
        },
        {
            "title": "Original Oil Painting - 'Ocean Storm'",
            "description": "Abstract oil on canvas by an emerging artist. 24x36 inches.",
            "category": "Art",
            "image_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80",
            "starting_price": 800.00,
            "end_time": timezone.now() + timedelta(hours=5),
        },
        {
            "title": "Vintage Leica M3 Camera",
            "description": "Iconic 35mm rangefinder camera. Tested and fully functional.",
            "category": "Electronics",
            "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80",
            "starting_price": 1200.00,
            "end_time": timezone.now() + timedelta(days=4),
        },
        {
            "title": "Nike Air Jordan 1 Retro High",
            "description": "Chicago colorway. Size 10. Brand new in box with receipt.",
            "category": "Fashion",
            "image_url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80",
            "starting_price": 600.00,
            "end_time": timezone.now() + timedelta(days=3),
        }
    ]

    print("Seeding auctions...")
    for item in auctions:
        AuctionItem.objects.create(
            title=item['title'],
            description=item['description'],
            category=item['category'],
            image_url=item['image_url'],
            starting_price=item['starting_price'],
            end_time=item['end_time'],
            seller=seller
        )
    print(f"Successfully seeded {len(auctions)} auctions!")

if __name__ == '__main__':
    seed()
