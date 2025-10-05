import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Copy, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  productId: string;
  variantId: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface DeliveryDetails {
  method: string;
  cost: number;
  location: string;
  distanceFromCBD: number;
  courierDetails?: {
    name: string;
    phone: string;
    company?: string;
    pickupWindow?: string;
  };
}

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentConfirm: (transactionCode: string) => void;
  totalAmount: number;
  orderNumber: string;
  userId: string;
  customerInfo: { fullName: string; phone?: string };
  shippingAddress: { address: string; city: string; postalCode: string };
  orderItems: OrderItem[] | null | undefined;
  discountAmount?: number;
  deliveryDetails?: DeliveryDetails | null;
}

interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'timeout';
  transactionId?: string;
  receiptNumber?: string;
  resultDesc?: string;
}

const SUPABASE_URL = 'https://ppljsayhwtlogficifar.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGpzYXlod3Rsb2dmaWNpZmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkxMTUsImV4cCI6MjA2OTE4NTExNX0.4p82dukMJBFl1-EU9XOLmiHvBGfEQSFDVDOu9yilhUU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PaymentDialog = ({
  isOpen,
  onClose,
  onPaymentConfirm,
  totalAmount,
  orderNumber,
  userId,
  customerInfo: propCustomerInfo,
  shippingAddress,
  orderItems,
  discountAmount = 0,
  deliveryDetails = null,
}: PaymentDialogProps) => {
  const [step, setStep] = useState<'payment' | 'verification' | 'success' | 'failed'>('payment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'pending' });
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const MAX_VERIFICATION_ATTEMPTS = 12;
  const VERIFICATION_INTERVAL = 5000;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const checkPaymentStatus = async (checkoutRequestId: string): Promise<PaymentStatus> => {
    try {
      // Step 1: Check payment_records table for webhook updates
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/payment_records?checkout_request_id=eq.${checkoutRequestId}&order=created_at.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const records = await response.json();

      if (records && records.length > 0) {
        const record = records[0];
        console.log('Payment record found:', record);

        return {
          status: record.status === 'success' ? 'success' : 'failed',
          transactionId: record.transaction_id,
          receiptNumber: record.receipt_number,
          resultDesc: record.result_desc,
        };
      }

      // Step 2: If no webhook record after 3 attempts, verify directly with Paystack
      if (verificationAttempts >= 3) {
        console.log('No webhook record found, verifying directly with Paystack...');
        
        try {
          const verifyResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/paystack-verify`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ reference: checkoutRequestId }),
            }
          );

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('Paystack verification result:', verifyData);
            
            if (verifyData.success && verifyData.status === 'success') {
              // Create payment record since webhook didn't
              await createPaymentRecord(checkoutRequestId, verifyData);
              
              return {
                status: 'success',
                transactionId: verifyData.transactionId?.toString(),
                receiptNumber: checkoutRequestId,
                resultDesc: 'Payment verified directly',
              };
            } else if (verifyData.status === 'failed') {
              return {
                status: 'failed',
                resultDesc: 'Payment failed on Paystack',
              };
            }
          }
        } catch (verifyError) {
          console.log('Direct verification failed:', verifyError);
        }
      }

      console.log('No payment record found yet for:', checkoutRequestId);
      return { status: 'pending' };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { status: 'pending' };
    }
  };

  const createPaymentRecord = async (reference: string, verifyData: any) => {
    try {
      // Get order ID
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single();
      
      if (orders) {
        const paymentRecord = {
          order_id: orders.id,
          transaction_id: verifyData.transactionId?.toString() || reference,
          amount: verifyData.amount,
          status: 'success',
          checkout_request_id: reference,
          receipt_number: reference,
          result_desc: 'Payment verified via direct check',
          raw: verifyData
        };
        
        await supabase.from('payment_records').insert(paymentRecord);
        
        // Update order status
        const { data: statusData } = await supabase
          .from('order_status')
          .select('id')
          .eq('name', 'processing')
          .single();
        
        if (statusData) {
          await supabase
            .from('orders')
            .update({ status_id: statusData.id })
            .eq('id', orders.id);
        }
        
        console.log('Payment record and order status updated successfully');
      }
    } catch (error) {
      console.error('Error creating payment record:', error);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 'verification' && checkoutRequestId && verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
      intervalId = setInterval(async () => {
        const status = await checkPaymentStatus(checkoutRequestId);
        setPaymentStatus(status);
        setVerificationAttempts((prev) => prev + 1);

        if (status.status === 'success') {
          setStep('success');
          setIsProcessing(false);
          toast({
            title: "Payment Successful!",
            description: `Transaction ID: ${status.receiptNumber || status.transactionId}`,
          });
          setTimeout(() => {
            onPaymentConfirm(status.receiptNumber || status.transactionId || 'VERIFIED');
          }, 2000);
        } else if (status.status === 'failed') {
          setStep('failed');
          setIsProcessing(false);
          toast({
            variant: "destructive",
            title: "Payment Failed",
            description: status.resultDesc || "Transaction was not completed successfully.",
          });
        }
      }, VERIFICATION_INTERVAL);
    }

    if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS && step === 'verification') {
      setPaymentStatus({ status: 'timeout' });
      setStep('failed');
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Payment Verification Timeout",
        description: "Could not verify payment. Please contact support if money was deducted.",
      });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, checkoutRequestId, verificationAttempts, onPaymentConfirm, toast]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'payment_status' && event.data.reference === checkoutRequestId) {
        if (event.data.status === 'success') {
          setPaymentStatus({ status: 'success', transactionId: event.data.reference });
          setStep('success');
          setIsProcessing(false);
          toast({
            title: "Payment Successful!",
            description: `Transaction ID: ${event.data.reference}`,
          });
          setTimeout(() => {
            onPaymentConfirm(event.data.reference);
          }, 2000);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkoutRequestId, onPaymentConfirm, toast]);

  const handlePaystackPayment = async () => {
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address for payment.",
      });
      return;
    }

    if (!totalAmount || totalAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "The payment amount must be greater than zero.",
      });
      return;
    }

    if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.trim() === '') {
      toast({
        variant: "destructive",
        title: "Invalid Order Number",
        description: "A valid order number is required for payment.",
      });
      return;
    }

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      console.error('Order items validation failed:', { orderItems });
      toast({
        variant: "destructive",
        title: "No Items in Order",
        description: "Please add at least one item to your order before proceeding.",
      });
      return;
    }

    if (!deliveryDetails) {
      console.error('Delivery details missing');
      toast({
        variant: "destructive",
        title: "Delivery Details Missing",
        description: "Please select a delivery method before proceeding.",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const paymentReference = `${orderNumber}-${Date.now()}`;

      console.log('Sending Paystack request:', {
        amount: totalAmount,
        email: customerEmail,
        orderNumber,
        paymentReference,
        orderItems,
        deliveryDetails,
      });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/paystack-initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          amount: totalAmount,
          email: customerEmail,
          paymentReference,
          originalOrderNumber: orderNumber,
          customerInfo: {
            userId,
            fullName: propCustomerInfo.fullName,
            phone: propCustomerInfo.phone,
            email: customerEmail,
          },
          shippingAddress,
          orderItems,
          discountAmount,
          deliveryDetails,
        }),
      });

      const data = await response.json();
      console.log('Paystack response:', data);

      if (response.ok && data.success && data.authorizationUrl) {
        setCheckoutRequestId(data.reference);
        setVerificationAttempts(0);
        setStep('verification');
        setIsProcessing(false);

        const paystackWindow = window.open(
          data.authorizationUrl,
          'Paystack Payment',
          'width=600,height=700'
        );

        toast({
          title: "Redirecting to Paystack",
          description: "Complete your payment in the popup window.",
        });

        if (!paystackWindow) {
          window.location.href = data.authorizationUrl;
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment Initialization Failed',
          description: data.message || data.error || 'Could not initialize payment.',
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Paystack payment error:', error);
      toast({
        variant: "destructive",
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not connect to the payment server. Please try again.',
      });
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setStep('payment');
    setCheckoutRequestId('');
    setPaymentStatus({ status: 'pending' });
    setVerificationAttempts(0);
    setCustomerEmail('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const handleRetryPayment = () => {
    setStep('payment');
    setCheckoutRequestId('');
    setPaymentStatus({ status: 'pending' });
    setVerificationAttempts(0);
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            Payment Options
          </DialogTitle>
          <DialogDescription>
            Complete your payment for Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-green-800 mb-2">
                Pay with Paystack
              </h3>
              <div className="space-y-4">
                <div className="bg-white p-3 rounded border">
                  <Label className="text-sm text-gray-600" htmlFor="email">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for payment receipts
                  </p>
                </div>

                <div className="bg-white p-3 rounded border">
                  <Label className="text-sm text-gray-600">Amount</Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xl font-bold text-green-700">
                      {formatPrice(totalAmount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(totalAmount.toString())}
                      className="h-8 px-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {deliveryDetails && (
                  <div className="bg-white p-3 rounded border">
                    <Label className="text-sm text-gray-600">Delivery Method</Label>
                    <p className="text-sm font-medium mt-1">
                      {deliveryDetails.method.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {deliveryDetails.location} • {formatPrice(deliveryDetails.cost)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'verification' && (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
              <h3 className="text-base font-semibold mb-1">Confirming Payment</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Please complete the payment in the Paystack window.
              </p>
              <p className="text-xs text-gray-500">
                Attempt {verificationAttempts + 1} of {MAX_VERIFICATION_ATTEMPTS}
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold mb-1 text-green-800">
                Payment Successful!
              </h3>
              <p className="text-xs text-muted-foreground">
                Your payment has been verified.
              </p>
            </div>

            {paymentStatus.receiptNumber && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <Label className="text-xs text-green-700">Transaction Receipt</Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm font-bold text-green-800">
                    {paymentStatus.receiptNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(paymentStatus.receiptNumber || '')}
                    className="h-6 px-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'failed' && (
          <div className="space-y-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold mb-1 text-red-800">
                Payment Failed
              </h3>
              <p className="text-xs text-muted-foreground">
                {paymentStatus.resultDesc || 'The payment could not be completed.'}
              </p>
            </div>

            <div className="text-xs text-red-700 bg-red-50 p-3 rounded border border-red-200">
              <strong>What happened:</strong>
              <p className="mt-1">
                {paymentStatus.status === 'timeout'
                  ? 'Payment verification timed out. If money was deducted, please contact support.'
                  : 'The payment was cancelled or failed.'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>

          {step === 'payment' && (
            <Button
              onClick={handlePaystackPayment}
              disabled={isProcessing || !customerEmail || totalAmount <= 0 || !deliveryDetails}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Initializing...' : 'Pay Now'}
            </Button>
          )}

          {step === 'verification' && (
            <Button
              variant="outline"
              onClick={handleRetryPayment}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Try Again
            </Button>
          )}

          {step === 'failed' && (
            <Button
              onClick={handleRetryPayment}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;