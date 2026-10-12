import os
import hmac
import hashlib

class PaymentService:
    @staticmethod
    def get_razorpay_keys():
        """Retrieve Razorpay credentials from environment variables."""
        return {
            'key_id': os.environ.get('RAZORPAY_KEY_ID'),
            'key_secret': os.environ.get('RAZORPAY_KEY_SECRET')
        }

    @staticmethod
    def is_configured():
        keys = PaymentService.get_razorpay_keys()
        return bool(keys['key_id'] and keys['key_secret'])

    @staticmethod
    def create_payment_order(order_id, amount_in_inr):
        """
        Creates a Razorpay order.
        Amount must be in Decimal or float representing standard INR.
        Returns the Razorpay order ID.
        """
        keys = PaymentService.get_razorpay_keys()
        if not PaymentService.is_configured():
            raise ValueError("Razorpay credentials are not configured. Cannot create payment order.")

        try:
            import razorpay
            client = razorpay.Client(auth=(keys['key_id'], keys['key_secret']))
            
            # Convert INR to paise safely
            from decimal import Decimal
            amount_decimal = Decimal(str(amount_in_inr))
            amount_in_paise = int((amount_decimal * Decimal('100')).to_integral_value())

            data = {
                "amount": amount_in_paise,
                "currency": "INR",
                "receipt": str(order_id)
            }
            payment = client.order.create(data=data)
            return payment['id']
        except Exception as e:
            raise Exception(f"Failed to create Razorpay order: {str(e)}")

    @staticmethod
    def verify_payment_signature(razorpay_order_id, razorpay_payment_id, signature):
        keys = PaymentService.get_razorpay_keys()
        if not PaymentService.is_configured():
            # Phase 3.1 Audit: Never mark an order PAID when credentials are missing
            return False
            
        generated_signature = hmac.new(
            keys['key_secret'].encode('utf-8'),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(generated_signature, signature)

    @staticmethod
    def verify_webhook_signature(raw_body, signature):
        webhook_secret = os.environ.get('RAZORPAY_WEBHOOK_SECRET')
        if not webhook_secret:
            return False
        
        generated_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(generated_signature, signature)
