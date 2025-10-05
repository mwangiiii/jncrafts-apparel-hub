'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

const PaymentSuccessPage = () => {
  const [status, setStatus] = useState('verifying');
  const [orderReference, setOrderReference] = useState('');

  useEffect(() => {
    // Get reference from URL parameters (handles duplicates like &trxref)
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    
    if (reference) {
      setOrderReference(reference);
      // Verify payment with your backend
      verifyPayment(reference);
    } else {
      setStatus('error');
    }
  }, []);

  const verifyPayment = async (reference: string) => {
    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const SUPABASE_URL = 'https://ppljsayhwtlogficifar.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGpzYXlod3Rsb2dmaWNpZmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkxMTUsImV4cCI6MjA2OTE4NTExNX0.4p82dukMJBFl1-EU9XOLmiHvBGfEQSFDVDOu9yilhUU';
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/payment_records?checkout_request_id=eq.${reference}&order=created_at.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      const records = await response.json();
      
      if (records && records.length > 0 && records[0].status === 'success') {
        setStatus('success');
      } else {
        setStatus('pending');
      }

      // Notify opener (e.g., dialog) via postMessage
      if (window.opener) {
        window.opener.postMessage(
          { type: 'payment_status', status: records && records.length > 0 && records[0].status === 'success' ? 'success' : 'pending', reference },
          '*'
        );
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
    }
  };

  // Auto-close popup on success (Paystack redirect)
  useEffect(() => {
    if (status === 'success') {
      setTimeout(() => {
        if (window.opener) {
          window.close();
        }
      }, 3000);
    }
  }, [status]);

  const goToHome = () => {
    window.location.href = '/';
  };

  const goToOrders = () => {
    window.location.href = '/orders';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {status === 'verifying' && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Verifying Payment...
            </h1>
            <p className="text-gray-600">
              Please wait while we confirm your transaction
            </p>
            {orderReference && (
              <p className="text-sm text-gray-500 mt-4">
                Reference: {orderReference}
              </p>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-6">
              Your payment has been processed successfully.
              You'll receive a confirmation email shortly.
            </p>
            {orderReference && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Order Reference</p>
                <p className="text-lg font-mono font-semibold text-gray-800">
                  {orderReference}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={goToOrders}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                View My Orders
              </button>
              <button
                onClick={goToHome}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-yellow-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Payment Pending
            </h1>
            <p className="text-gray-600 mb-6">
              Your payment is being processed. This may take a few moments.
            </p>
            <button
              onClick={() => verifyPayment(orderReference)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Check Again
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Payment Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">
              We couldn't verify your payment. If money was deducted, 
              please contact support with your transaction reference.
            </p>
            <div className="space-y-3">
              <button
                onClick={goToHome}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;