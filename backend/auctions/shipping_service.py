from decimal import Decimal
import os

class ShippingService:
    @staticmethod
    def calculate_shipping_charge(address):
        """
        Calculates the shipping charge based on the provided Address object.
        For Phase 3, this uses a configurable flat rate or default.
        """
        # Try to read from env, otherwise default to a flat 100.00 INR
        base_rate = os.environ.get('DEFAULT_SHIPPING_CHARGE_INR', '100.00')
        try:
            charge = Decimal(base_rate)
        except:
            charge = Decimal('100.00')
            
        # Example condition: if country is not India, charge more
        if address and address.country and address.country.lower() != 'india':
            charge += Decimal('500.00')
            
        return charge
