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
                Send Payment Via M-Pesa
              </h3>
              <div className="space-y-2">
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

            <div className="text-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mx-auto mb-1" />
              <p>Send payment via M-Pesa, then click "I've Made Payment".</p>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground bg-accent/5 p-2 rounded">
              <strong>Quick Steps:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-0.5 text-xs">
                <li>Open M-Pesa → Send Money</li>
                <li>Number: <strong>{mpesaNumber}</strong></li>
                <li>Amount: <strong>{formatPrice(totalAmount)}</strong></li>
                <li>Complete & get transaction code</li>
              </ol>
            </div>
          </div>
        )}

        {step === 'confirmation' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-base font-semibold mb-1">Payment Confirmation</h3>
              <p className="text-xs text-muted-foreground">
                Enter your M-Pesa transaction code to complete the order.
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

            <div className="text-xs text-accent bg-accent/5 p-2 rounded">
              <strong>Find code in SMS:</strong>
              <p className="mt-0.5">
                Look for 8-10 characters like "QA12B3C4D5" in your M-Pesa confirmation message.
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