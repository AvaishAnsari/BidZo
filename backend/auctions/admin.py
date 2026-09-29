from django.contrib import admin
from .models import AuctionItem, Bid

# Registering models so they show up visually
admin.site.register(AuctionItem)
admin.site.register(Bid)
