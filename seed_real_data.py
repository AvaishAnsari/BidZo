import os
import django
import requests
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from auctions.models import AuctionItem, UserProfile

def fetch_real_products():
    """Fetch 100+ real-looking products from DummyJSON API"""
    print("Fetching real products from DummyJSON API...")
    url = "https://dummyjson.com/products?limit=100"
    response = requests.get(url)
    
    if not response.ok:
        print(f"Failed to fetch products: {response.status_code}")
        return []
        
    data = response.json()
    return data.get('products', [])

def seed():
    print("Creating dummy seller accounts...")
    # Create multiple sellers for realistic variety
    sellers = []
    for i in range(1, 6):
        seller, created = User.objects.get_or_create(
            username=f'pro_seller_{i}', 
            email=f'seller{i}@bidzo.com'
        )
        if created:
            seller.set_password('demo123')
            seller.save()
            profile, _ = UserProfile.objects.get_or_create(user=seller)
            profile.role = 'seller'
            profile.save()
        sellers.append(seller)

    products = fetch_real_products()
    
    if not products:
        print("No products fetched. Exiting.")
        return

    print("Cleaning up old dummy auctions...")
    AuctionItem.objects.all().delete()
    
    print(f"Seeding {len(products)} real auctions into the database...")
    
    for item in products:
        # DummyJSON usually provides a thumbnail and a list of images. 
        # We prefer a nice high-res image if available.
        images = item.get('images', [])
        image_url = images[0] if images else item.get('thumbnail', '')
        
        # Calculate random end times (between 1 and 14 days from now)
        days_to_add = random.randint(1, 14)
        hours_to_add = random.randint(0, 23)
        end_time = timezone.now() + timedelta(days=days_to_add, hours=hours_to_add)
        
        # Determine starting price (discounted a bit to act as an auction starting point)
        retail_price = float(item.get('price', 10.0))
        starting_price = round(retail_price * random.uniform(0.3, 0.7), 2)
        
        AuctionItem.objects.create(
            title=item.get('title', 'Unknown Item'),
            description=item.get('description', 'No description available.'),
            category=str(item.get('category', 'General')).title().replace('-', ' '),
            image_url=image_url,
            starting_price=starting_price,
            end_time=end_time,
            seller=random.choice(sellers)
        )
        
    print(f"Successfully seeded {len(products)} real-world auctions!")
    print("Go check your BidZo homepage now!")

if __name__ == '__main__':
    seed()
