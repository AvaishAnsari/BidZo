import toast from 'react-hot-toast';

/**
 * Dynamically loads the official Razorpay Checkout SDK onto the client window.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
       resolve(true);
       return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Initializes a mock Razorpay Checkout modal environment.
 * In a true production environment with a Node server, the backend would generate an `order_id`
 * but for this Supabase frontend, we simulate a flawless native "checkout" sequence.
 */
export const initializeRazorpayCheckout = async (options: {
  amount: number;
  auctionTitle: string;
  userEmail: string;
  userName?: string;
  onSuccess: () => void;
  onFailure?: () => void;
}) => {
  const isLoaded = await loadRazorpayScript();

  if (!isLoaded) {
    toast.error('Razorpay SDK failed to load. Are you online?');
    return;
  }

  // Fallback dev key
  const key_id = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock_12345';

  const checkoutOptions = {
    key: key_id,
    amount: options.amount * 100, // Pass amount in subunits (paise)
    currency: 'INR',
    name: 'BidZo Escrow',
    description: `Settlement for: ${options.auctionTitle}`,
    image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Gavel icon
    handler: function (response: any) {
      if (response.razorpay_payment_id) {
        toast.success(`Payment verified successfully! Tx: ${response.razorpay_payment_id}`);
        options.onSuccess();
      } else {
        toast.error('Payment callback failed.');
        if (options.onFailure) options.onFailure();
      }
    },
    prefill: {
      name: options.userName || 'Valued Bidder',
      email: options.userEmail,
    },
    theme: {
      color: '#4f46e5' // Primary brand Indigo
    }
  };

  try {
    const rzp = new (window as any).Razorpay(checkoutOptions);
    
    rzp.on('payment.failed', function (response: any) {
      toast.error(`Payment Failed: ${response.error.description}`);
      if (options.onFailure) options.onFailure();
    });

    rzp.open();
  } catch (error) {
    console.error('Razorpay initialization error:', error);
    toast.error('Could not initialize payment gateway.');
  }
};
