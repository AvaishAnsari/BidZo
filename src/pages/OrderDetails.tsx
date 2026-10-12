import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { initializeRazorpayCheckout } from '../utils/razorpay';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_ROOT_URL } from '../services/api';

interface Order {
  id: string;
  auction_title: string;
  auction_image_url: string;
  buyer_name: string;
  seller_name: string;
  winning_amount: string;
  shipping_charge: string;
  total_amount: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  razorpay_order_id?: string;
  delivery_address_details?: {
    full_name: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
    country: string;
  };
  shipment?: {
    status: string;
    courier_name: string;
    tracking_number: string;
    dispatched_at: string;
  };
}

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = () => {
    if (!order || !order.razorpay_order_id) {
      toast.error("Missing payment details. Please contact support.");
      return;
    }
    
    initializeRazorpayCheckout({
      amount: parseFloat(order.total_amount),
      orderId: order.razorpay_order_id,
      auctionTitle: order.auction_title,
      userEmail: user?.email || 'buyer@bidzo.com',
      userName: order.buyer_name,
      onSuccess: async (response) => {
        try {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
          const apiUrl = API_ROOT_URL;
          const verifyRes = await fetch(`${apiUrl}/api/orders/${order.id}/verify-payment/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            toast.success("Payment confirmed!");
            setOrder({ ...order, payment_status: 'PAID', order_status: 'PROCESSING' });
          } else {
            toast.error(verifyData.error || "Payment verification failed.");
          }
        } catch (err) {
          toast.error("Network error during verification.");
        }
      }
    });
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const apiUrl = API_ROOT_URL;
        
        const res = await fetch(`${apiUrl}/api/orders/${id}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch order details');
        }

        const data = await res.json();
        setOrder(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl flex items-center justify-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p className="font-medium">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === 'PAID';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Order Summary</h1>
              <p className="text-gray-400 text-sm">Order ID: {order.id}</p>
            </div>
          </div>
        </div>

        <div className="p-8 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Item Details</h2>
            <div className="flex gap-4">
              {order.auction_image_url && (
                <img 
                  src={order.auction_image_url} 
                  alt={order.auction_title}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-700"
                />
              )}
              <div>
                <h3 className="font-medium text-white">{order.auction_title}</h3>
                <p className="text-sm text-gray-400 mt-1">Seller: @{order.seller_name}</p>
                <p className="text-sm text-gray-400">Buyer: @{order.buyer_name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Status</h2>
              <div className="flex gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${isPaid ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                  {order.payment_status}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {order.order_status}
                </span>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Winning Bid</span>
                <span>₹{parseFloat(order.winning_amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400 mb-4 pb-4 border-b border-gray-700/50">
                <span>Shipping Charge</span>
                <span>₹{parseFloat(order.shipping_charge).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-lg">
                <span>Total</span>
                <span>₹{parseFloat(order.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {!isPaid && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                <button 
                  onClick={handlePayment}
                  className="w-full mt-3 py-3 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Pay Now
                </button>
              </div>
            )}
            
            {isPaid && (
              <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Payment Successful</span>
              </div>
            )}
            
            {order.delivery_address_details && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Delivery Address</h2>
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 text-sm text-gray-400">
                  <p className="font-medium text-white mb-1">{order.delivery_address_details.full_name}</p>
                  <p>{order.delivery_address_details.address_line_1}</p>
                  {order.delivery_address_details.address_line_2 && <p>{order.delivery_address_details.address_line_2}</p>}
                  <p>{order.delivery_address_details.city}, {order.delivery_address_details.state} {order.delivery_address_details.postal_code}</p>
                  <p>{order.delivery_address_details.country}</p>
                  <p className="mt-2">Phone: {order.delivery_address_details.phone}</p>
                </div>
              </div>
            )}
            
            {order.shipment && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Shipment Details</h2>
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 text-sm text-gray-400">
                  <div className="flex justify-between mb-2">
                    <span>Status</span>
                    <span className="font-medium text-indigo-400">{order.shipment.status.replace(/_/g, ' ')}</span>
                  </div>
                  {order.shipment.courier_name && (
                    <div className="flex justify-between mb-2">
                      <span>Courier</span>
                      <span className="text-white">{order.shipment.courier_name}</span>
                    </div>
                  )}
                  {order.shipment.tracking_number ? (
                    <div className="flex justify-between mb-2">
                      <span>Tracking ID</span>
                      <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">{order.shipment.tracking_number}</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 mt-2 text-xs italic">
                      Tracking info will be updated once dispatched.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
