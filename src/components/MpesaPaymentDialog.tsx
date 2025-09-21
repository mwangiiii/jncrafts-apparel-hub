import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, Copy, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';

interface MpesaPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentConfirm: (transactionCode: string) => void;
  totalAmount: number;
  orderNumber: string;
  isProcessing: boolean;
}

interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'timeout';
  transactionId?: string;
  receiptNumber?: string;
  resultDesc?: string;
}

const MpesaPaymentDialog = ({
  isOpen,
  onClose,
  onPaymentConfirm,
  totalAmount,
  orderNumber,
}: Omit<MpesaPaymentDialogProps, 'isProcessing'>) => {
  const [transactionCode, setTransactionCode] = useState('');
  const [step, setStep] = useState<'payment' | 'verification' | 'success' | 'failed'>('payment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'pending' });
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const [mpesaNumber, setMpesaNumber] = useState('');

  // Supabase configuration
  const SUPABASE_URL = 'https://ppljsayhwtlogficifar.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGpzYXlod3Rsb2dmaWNpZmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkxMTUsImV4cCI6MjA2OTE4NTExNX0.4p82dukMJBFl1-EU9XOLmiHvBGfEQSFDVDOu9yilhUU';

  const MAX_VERIFICATION_ATTEMPTS = 10; // Check for 1 minute (10 * 2 seconds)
  const VERIFICATION_INTERVAL = 10000; // Check every 10 seconds

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  // Check payment status in database
  const checkPaymentStatus = async (checkoutRequestId: string): Promise<PaymentStatus> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_records?checkout_request_id=eq.${checkoutRequestId}`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const records = await response.json();
      
      if (records && records.length > 0) {
        const record = records[0];
        return {
          status: record.status === 'success' ? 'success' : 'failed',
          transactionId: record.transaction_id,
          receiptNumber: record.receipt_number,
          resultDesc: record.result_desc,
        };
      }
      
      return { status: 'pending' };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { status: 'pending' };
    }
  };

  // Start payment verification polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (step === 'verification' && checkoutRequestId && verificationAttempts < MAX_VERIFICATION_ATTEMPTS) {
      intervalId = setInterval(async () => {
        const status = await checkPaymentStatus(checkoutRequestId);
        setPaymentStatus(status);
        setVerificationAttempts(prev => prev + 1);

        if (status.status === 'success') {
          setStep('success');
          toast({
            title: "Payment Successful!",
            description: `Transaction ID: ${status.receiptNumber}`,
          });
          // Auto-confirm the payment after 2 seconds
          setTimeout(() => {
            onPaymentConfirm(status.receiptNumber || status.transactionId || 'VERIFIED');
          }, 2000);
        } else if (status.status === 'failed') {
          setStep('failed');
          toast({
            variant: "destructive",
            title: "Payment Failed",
            description: status.resultDesc || "Transaction was not completed successfully.",
          });
        }
      }, VERIFICATION_INTERVAL);
    }

    // Timeout after maximum attempts
    if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS && step === 'verification') {
      setPaymentStatus({ status: 'timeout' });
      setStep('failed');
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

  const handleMakePayment = async () => {
    if (!mpesaNumber || !/^(07\d{8}|254\d{9})$/.test(mpesaNumber)) {
      toast({
        variant: "destructive",
        title: "Invalid Phone Number",
        description: "Please enter a valid M-Pesa phone number (e.g., 0712345678 or 254712345678).",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const requestPayload = {
        phoneNumber: mpesaNumber,
        amount: totalAmount,
        accountReference: orderNumber,
        transactionDesc: `Payment for Order #${orderNumber}`
      };

      console.log('Sending STK Push request:', requestPayload);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-stkpush`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(requestPayload),
      });
      
      const data = await res.json();
      console.log('STK Push response:', data);
      
      if (res.ok && data.success && data.data?.CheckoutRequestID) {
        setCheckoutRequestId(data.data.CheckoutRequestID);
        setVerificationAttempts(0);
        setStep('verification');
        toast({ 
          title: "STK Push sent!", 
          description: "Check your phone and enter your M-Pesa PIN to complete payment." 
        });
      } else {
        const errorMessage = data.error || data.message || "Payment initiation failed. Please try again.";
        toast({ 
          variant: "destructive", 
          title: "Payment failed", 
          description: errorMessage
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast({ 
        variant: "destructive", 
        title: "Network error", 
        description: "Could not reach payment server. Please check your connection." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setStep('payment');
    setTransactionCode('');
    setMpesaNumber('');
    setCheckoutRequestId('');
    setPaymentStatus({ status: 'pending' });
    setVerificationAttempts(0);
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600" />
            M-Pesa Payment
          </DialogTitle>
          <DialogDescription>
            Complete your payment for Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-green-800 mb-2">
                M-Pesa STK Push Payment
              </h3>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded border">
                  <Label className="text-sm text-gray-600" htmlFor="mpesaNumber">Phone Number:</Label>
                  <Input
                    id="mpesaNumber"
                    type="tel"
                    value={mpesaNumber}
                    onChange={e => setMpesaNumber(e.target.value)}
                    placeholder="0712345678 or 254712345678"
                    className="font-mono text-center tracking-wide mt-1"
                    maxLength={12}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the phone number that will receive the STK Push
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <Label className="text-sm text-gray-600">Amount:</Label>
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
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
              <strong>How STK Push works:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Enter your M-Pesa phone number above</li>
                <li>Click "Send STK Push"</li>
                <li>You'll receive a payment prompt on your phone</li>
                <li>Enter your M-Pesa PIN to complete payment</li>
                <li>We'll automatically verify the transaction</li>
              </ol>
            </div>
          </div>
        )}

        {step === 'verification' && (
          <div className="space-y-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
              <h3 className="text-base font-semibold mb-1">Confirming your Payment</h3>
              <p className="text-xs text-muted-foreground">
                Please complete the payment on your phone. We're waiting for confirmation...
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-sm">
                <p className="font-medium text-blue-800 mb-2">📱 Complete payment on your phone:</p>
                <ol className="text-blue-700 text-xs space-y-1 list-decimal list-inside">
                  <li>Check your phone for M-Pesa STK Push notification</li>
                  <li>Enter your M-Pesa PIN to authorize payment</li>
                  <li>Wait for transaction confirmation</li>
                </ol>
              </div>
            </div>

            {/* <div className="text-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mx-auto mb-1" />
              <p>Verification attempt {verificationAttempts} of {MAX_VERIFICATION_ATTEMPTS}</p>
              <p>Timeout in {Math.ceil((MAX_VERIFICATION_ATTEMPTS - verificationAttempts) * VERIFICATION_INTERVAL / 1000)} seconds</p>
            </div> */}
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold mb-1 text-green-800">Payment Successful!</h3>
              <p className="text-xs text-muted-foreground">
                Your payment has been verified and processed successfully.
              </p>
            </div>

            {paymentStatus.receiptNumber && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <Label className="text-xs text-green-700">Transaction Receipt:</Label>
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

            <p className="text-xs text-center text-green-700 bg-green-50 p-2 rounded">
              ✅ Payment verified with M-Pesa. Your order will be processed shortly.
            </p>
          </div>
        )}

        {step === 'failed' && (
          <div className="space-y-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold mb-1 text-red-800">Payment Failed</h3>
              <p className="text-xs text-muted-foreground">
                {paymentStatus.resultDesc || "The payment could not be completed or verified."}
              </p>
            </div>

            <div className="text-xs text-red-700 bg-red-50 p-3 rounded border border-red-200">
              <strong>What happened:</strong>
              <p className="mt-1">
                {paymentStatus.status === 'timeout' 
                  ? "Payment verification timed out. If money was deducted, please contact support with your transaction details."
                  : "The payment was either cancelled, failed, or insufficient funds were available."
                }
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
              onClick={handleMakePayment} 
              disabled={isProcessing || !mpesaNumber}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Sending STK Push...' : 'Make Payment'}
            </Button>
          )}
          
          {step === 'verification' && (
            <Button 
              variant="outline"
              onClick={handleRetryPayment}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Try Different Number
            </Button>
          )}
          
          {step === 'failed' && (
            <Button 
              onClick={handleRetryPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MpesaPaymentDialog;