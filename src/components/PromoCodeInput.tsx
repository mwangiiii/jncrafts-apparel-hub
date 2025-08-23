import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tag, Check, X } from 'lucide-react';

interface PromoCodeInputProps {
  onCodeApplied: (discount: any) => void;
  onCodeRemoved: () => void;
  appliedDiscount?: any;
  orderTotal: number;
}

const PromoCodeInput = ({ onCodeApplied, onCodeRemoved, appliedDiscount, orderTotal }: PromoCodeInputProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validatePromoCode = async () => {
    if (!code.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a promo code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Check if code exists and is valid
      const { data: discount, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .eq('requires_code', true)
        .or('start_date.is.null,start_date.lte.' + new Date().toISOString())
        .or('end_date.is.null,end_date.gte.' + new Date().toISOString())
        .single();

      if (error || !discount) {
        toast({
          title: "Invalid Code",
          description: "This promo code is not valid or has expired",
          variant: "destructive"
        });
        return;
      }

      // Check usage limits
      if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
        toast({
          title: "Code Unavailable",
          description: "This promo code has reached its usage limit",
          variant: "destructive"
        });
        return;
      }

      // Check minimum order amount
      if (discount.min_order_amount && orderTotal < discount.min_order_amount) {
        toast({
          title: "Minimum Order Not Met",
          description: `This code requires a minimum order of $${discount.min_order_amount}`,
          variant: "destructive"
        });
        return;
      }

      // Apply the discount
      onCodeApplied(discount);
      setCode('');
      
      toast({
        title: "Code Applied!",
        description: `${discount.name} has been applied to your order`,
      });
      
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Error",
        description: "Failed to validate promo code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCode = () => {
    onCodeRemoved();
    toast({
      title: "Code Removed",
      description: "Promo code has been removed from your order",
    });
  };

  const calculateDiscount = (discount: any, total: number) => {
    if (discount.discount_type === 'percentage') {
      return (total * discount.discount_value) / 100;
    }
    return Math.min(discount.discount_value, total);
  };

  return (
    <div className="space-y-4">
      {appliedDiscount ? (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-full">
                <Tag className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-brand">{appliedDiscount.name}</h4>
                <p className="text-sm text-muted-foreground">{appliedDiscount.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-accent text-accent-foreground">
                -{appliedDiscount.discount_type === 'percentage' 
                  ? `${appliedDiscount.discount_value}%`
                  : `$${appliedDiscount.discount_value}`
                }
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeCode}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-accent/20">
            <div className="flex justify-between text-sm">
              <span>Discount Amount:</span>
              <span className="font-semibold text-accent">
                -${calculateDiscount(appliedDiscount, orderTotal).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="promo-code" className="text-sm font-medium">
            Promo Code (Optional)
          </Label>
          <div className="flex gap-2">
            <Input
              id="promo-code"
              placeholder="Enter promo code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && validatePromoCode()}
              className="flex-1"
            />
            <Button
              onClick={validatePromoCode}
              disabled={loading || !code.trim()}
              className="px-6"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;