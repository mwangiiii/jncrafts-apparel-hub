import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Clock, Copy, Phone } from 'lucide-react';
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

const MpesaPaymentDialog = ({
  isOpen,
  onClose,
  onPaymentConfirm,
  totalAmount,
  orderNumber,
  isProcessing
}: MpesaPaymentDialogProps) => {
  const [transactionCode, setTransactionCode] = useState('');
  const [step, setStep] = useState<'payment' | 'confirmation'>('payment');
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const mpesaNumber = '0710573084';
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Number copied to clipboard",
    });
  };

  const handlePaymentMade = () => {
    setStep('confirmation');
  };

  const handleConfirmPayment = () => {
    if (!transactionCode.trim()) {
      toast({
        variant: "destructive",
        title: "Transaction Code Required",
        description: "Please enter your M-Pesa transaction code",
      });
      return;
    }
    
    onPaymentConfirm(transactionCode.trim());
  };

  const resetDialog = () => {
    setStep('payment');
    setTransactionCode('');
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
          <div className="space-y-6">
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Send Payment Via M-Pesa
              </h3>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border">
                  <Label className="text-sm text-gray-600">Send to:</Label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xl font-mono font-bold">{mpesaNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(mpesaNumber)}
                      className="h-8 px-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
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

            <div className="text-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mx-auto mb-2" />
              <p>
                Send the payment now via M-Pesa. Once sent, click "I've Made Payment" below.
              </p>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground bg-accent/5 p-3 rounded">
              <strong>Instructions:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Go to M-Pesa on your phone</li>
                <li>Select "Send Money"</li>
                <li>Enter number: <strong>{mpesaNumber}</strong></li>
                <li>Enter amount: <strong>{formatPrice(totalAmount)}</strong></li>
                <li>Complete the transaction</li>
              </ol>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Payment Confirmation</h3>
              <p className="text-sm text-muted-foreground">
                Please enter your M-Pesa transaction code to complete your order.
              </p>
            </div>

            <div>
              <Label htmlFor="transactionCode">M-Pesa Transaction Code</Label>
              <Input
                id="transactionCode"
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                placeholder="e.g., QA12B3C4D5"
                className="font-mono text-center tracking-wide"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find this code in your M-Pesa confirmation message
              </p>
            </div>

            <div className="text-xs text-accent bg-accent/5 p-3 rounded">
              <strong>Where to find your transaction code:</strong>
              <p className="mt-1">
                Check your SMS messages for the M-Pesa confirmation. The transaction code is usually 
                a 8-10 character code like "QA12B3C4D5" in the message.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {step === 'payment' ? (
            <Button onClick={handlePaymentMade} className="bg-green-600 hover:bg-green-700">
              I've Made Payment
            </Button>
          ) : (
            <Button 
              onClick={handleConfirmPayment} 
              disabled={!transactionCode.trim() || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing Order...' : 'Confirm Payment'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MpesaPaymentDialog;