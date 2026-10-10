import toast from 'react-hot-toast';
import { getAuthHeaders } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: any) => void) => void } }
}

const loadRazorpayScript = (): Promise<boolean> => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(Boolean(window.Razorpay));
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.detail || 'Payment request failed.');
  return body;
}

export const initializeRazorpayCheckout = async (options: {
  auctionId: number;
  auctionTitle: string;
  userEmail: string;
  userName?: string;
  onSuccess: () => void;
  onFailure?: () => void;
}) => {
  try {
    const orderResponse = await fetch(`${API_BASE_URL}/payments/orders/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ auction_id: options.auctionId }),
    });
    const order = await readResponse(orderResponse);
    if (!(await loadRazorpayScript()) || !window.Razorpay) throw new Error('Razorpay Checkout could not be loaded.');

    const checkout = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'BidZo',
      description: `Winning bid: ${options.auctionTitle}`,
      prefill: { name: options.userName || '', email: options.userEmail },
      theme: { color: '#8b5e2c' },
      handler: async (paymentResponse: any) => {
        try {
          const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentResponse),
          });
          await readResponse(verifyResponse);
          toast.success('Payment verified securely.');
          options.onSuccess();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not verify payment.');
          options.onFailure?.();
        }
      },
    });
    checkout.on('payment.failed', (failure: any) => {
      toast.error(failure?.error?.description || 'Payment failed.');
      options.onFailure?.();
    });
    checkout.open();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not start secure checkout.');
    options.onFailure?.();
  }
};

export async function fetchAuctionPaymentStatus(auctionId: number): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/payments/auctions/${auctionId}/`, { headers: getAuthHeaders() });
  const body = await readResponse(response);
  return body.status;
}
