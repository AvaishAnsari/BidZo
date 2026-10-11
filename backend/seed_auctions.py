import os
import sys
from pathlib import Path
import django
from django.utils import timezone
import datetime

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from auctions.models import AuctionItem, Bid

def seed():
    print("Clearing existing junk auctions...")
    AuctionItem.objects.all().delete()

    print("Creating premium seller...")
    user, created = User.objects.get_or_create(username='premium_seller', email='seller@bidzo.com')
    if created:
        user.set_password('securepassword123')
        user.save()
        user.profile.role = 'seller'
        user.profile.save()

    print("Seeding premium dataset...")
    dataset = [
        {
            "title": "Rolex Submariner Date - 2023 Model",
            "description": "Pristine condition Rolex Submariner Date with black dial and Cerachrom bezel. Comes with original box and papers.",
            "category": "Watches",
            "starting_price": 12000,
            "current_highest_bid": 12000,
            "image_url": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop",
            "end_days": 3
        },
        {
            "title": "Sony A7 IV Mirrorless Camera",
            "description": "Barely used Sony A7 IV full-frame mirrorless camera body. Includes 1 extra battery and carrying case.",
            "category": "Electronics",
            "starting_price": 1800,
            "current_highest_bid": 1950,
            "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop",
            "end_days": 1
        },
        {
            "title": "Vintage 1960s Gibson Les Paul",
            "description": "A true collector's piece. This 1960s Gibson Les Paul retains its original sunburst finish and electronics.",
            "category": "Collectibles",
            "starting_price": 45000,
            "current_highest_bid": 47500,
            "image_url": "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?q=80&w=1000&auto=format&fit=crop",
            "end_days": 5
        },
        {
            "title": "Porsche 911 Carrera S (992)",
            "description": "Stunning GT Silver Metallic Porsche 911 Carrera S with low mileage. Full service history and clean title.",
            "category": "Vehicles",
            "starting_price": 95000,
            "current_highest_bid": 96500,
            "image_url": "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=1000&auto=format&fit=crop",
            "end_days": 7
        },
        {
            "title": "Diamond Tennis Bracelet 18k White Gold",
            "description": "Elegant 5-carat diamond tennis bracelet set in 18k white gold. VS clarity, G color. Certified.",
            "category": "Jewelry",
            "starting_price": 3500,
            "current_highest_bid": 3800,
            "image_url": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1000&auto=format&fit=crop",
            "end_days": 2
        },
        {
            "title": "Apple MacBook Pro 16-inch M3 Max",
            "description": "Latest M3 Max chip, 36GB RAM, 1TB SSD. Space Black. Unopened in original packaging.",
            "category": "Electronics",
            "starting_price": 2500,
            "current_highest_bid": 2600,
            "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1000&auto=format&fit=crop",
            "end_days": 4
        },
        {
            "title": "Louis Vuitton Keepall Bandoulière 50",
            "description": "Classic monogram canvas travel bag. Excellent condition with minor patina on the leather trims.",
            "category": "Fashion",
            "starting_price": 1200,
            "current_highest_bid": 1200,
            "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1000&auto=format&fit=crop",
            "end_days": 2
        },
        {
            "title": "18th Century French Antique Clock",
            "description": "Authentic ornate brass mantel clock from the 18th century. Recently serviced and keeps perfect time.",
            "category": "Antiques",
            "starting_price": 850,
            "current_highest_bid": 900,
            "image_url": "http://localhost:8000/media/auctions/french_antique_clock_1.jpg",
            "end_days": 6
        },
        {
            "title": "Signed Michael Jordan Chicago Bulls Jersey",
            "description": "Authentic Mitchell & Ness jersey signed by Michael Jordan. Includes certificate of authenticity (JSA).",
            "category": "Sports",
            "starting_price": 5000,
            "current_highest_bid": 5400,
            "image_url": "https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1000&auto=format&fit=crop",
            "end_days": 5
        },
        {
            "title": "Ducati Panigale V4 S",
            "description": "Red Ducati Panigale V4 S. Only 1,200 miles. Akrapovic exhaust installed. Showroom condition.",
            "category": "Vehicles",
            "starting_price": 22000,
            "current_highest_bid": 23500,
            "image_url": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop",
            "end_days": 8
        },
        {
            "title": "First Edition Harry Potter and the Philosopher's Stone",
            "description": "Rare first edition UK print. Hardcover in good condition with minor wear on the dust jacket.",
            "category": "Collectibles",
            "starting_price": 15000,
            "current_highest_bid": 15500,
            "image_url": "https://images.unsplash.com/photo-1626618012641-bfbca5a31239?q=80&w=1000&auto=format&fit=crop",
            "end_days": 3
        },
        {
            "title": "Omega Speedmaster Professional Moonwatch",
            "description": "The legendary Moonwatch. Hesalite crystal, hand-wound caliber 3861. Barely worn.",
            "category": "Watches",
            "starting_price": 4200,
            "current_highest_bid": 4400,
            "image_url": "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=1000&auto=format&fit=crop",
            "end_days": 1
        }
    ]

    for item in dataset:
        AuctionItem.objects.create(
            seller=user,
            title=item['title'],
            description=item['description'],
            category=item['category'],
            starting_price=item['starting_price'],
            current_highest_bid=item['current_highest_bid'],
            image_url=item['image_url'],
            start_time=timezone.now(),
            end_time=timezone.now() + datetime.timedelta(days=item['end_days']),
            status='live',
            moderation_status='APPROVED'
        )
    print(f"Successfully seeded {len(dataset)} premium auction items!")

if __name__ == '__main__':
    seed()
