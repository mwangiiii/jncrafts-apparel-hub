import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, Plus, Minus, Trash2, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import OrderConfirmationDialog from './OrderConfirmationDialog';
import DeliveryMethodSelector from './DeliveryMethodSelector';
import AddressAutocomplete from './AddressAutocomplete';
import PaymentDialog from './MpesaPaymentDialog';
import { CartThumbnail } from './CartThumbnail';
import { Checkbox } from "@/components/ui/checkbox";

import { CartItem } from "@/types/database";
import { DeliveryMethod } from '@/components/DeliveryMethodSelector';

interface DeliveryDetails {
  method: DeliveryMethod;
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

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[] | undefined;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  isLoading?: boolean;
}

const Cart = ({ isOpen, onClose, items = [], onUpdateQuantity, onRemoveItem, onClearCart, isLoading = false }: CartProps) => {
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    postalCode: '',
    lat: undefined as number | undefined,
    lon: undefined as number | undefined,
    isCurrentLocation: false
  });
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const [deliveryReviewed, setDeliveryReviewed] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const total = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? (total * appliedDiscount.amount) / 100
      : appliedDiscount.amount
    : 0;
  const deliveryCost = deliveryDetails?.cost || 0;
  const finalTotal = Math.max(0, total - discountAmount + deliveryCost);

  useEffect(() => {
    if (user && isOpen) {
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [user, isOpen]);

  const handleAddressChange = (newAddress: typeof shippingAddress) => {
    setShippingAddress(newAddress);
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;

    setLoadingDiscount(true);
    try {
      const response = await fetch('/api/discounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode.toUpperCase(), total }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply discount');
      }

      const data = await response.json();

      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: data.message || "The discount code is invalid or has expired.",
        });
        return;
      }

      setAppliedDiscount({
        code: data.code,
        amount: data.amount,
        type: data.type,
      });

      toast({
        title: "Discount Applied!",
        description: `${data.name} - ${data.type === 'percentage' ? `${data.amount}%` : `${formatPrice(data.amount)}`} off`,
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply discount code.",
      });
    } finally {
      setLoadingDiscount(false);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please log in to place an order.",
      });
      return;
    }

    if (!customerInfo.fullName || !customerInfo.phone) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required customer information fields.",
      });
      return;
    }

    if (!shippingAddress.address || !shippingAddress.city) {
      toast({
        variant: "destructive",
        title: "Missing Address",
        description: "Please provide a complete shipping address (address and city are required).",
      });
      return;
    }

    if (!deliveryDetails) {
      toast({
        variant: "destructive",
        title: "Delivery Method Required",
        description: "Please select a delivery method.",
      });
      return;
    }

    if (!deliveryReviewed) {
      toast({
        variant: "destructive",
        title: "Review Required",
        description: "Please confirm that you have reviewed the delivery method and cost.",
      });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmOrder = () => {
    setOrderNumber(`ORD-${Date.now()}`);
    setShowConfirmation(false);
    setShowPayment(true);
  };

  const handlePaymentConfirm = (transactionCode: string) => {
    toast({
      title: "Order Placed Successfully!",
      description: `Your order ${orderNumber} has been placed successfully.`,
    });

    onClearCart();
    setCustomerInfo({ fullName: "", email: user?.email || "", phone: "" });
    setShippingAddress({ address: "", city: "", postalCode: "", lat: undefined, lon: undefined, isCurrentLocation: false });
    setDiscountCode("");
    setAppliedDiscount(null);
    setDeliveryDetails(null);
    setDeliveryReviewed(false);
    setShowConfirmation(false);
    setShowPayment(false);
    onClose();
  };

  return (
    <div>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Shopping Cart ({items.length})
            </SheetTitle>
            <SheetDescription>
              Review your items and proceed to checkout
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 pb-6">
            {!user && (
              <div className="bg-accent/10 border border-accent rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <User className="h-4 w-4" />
                  <Button
                    onClick={() => navigate('/auth')}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition"
                  >
                    Login Required
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please log in to place an order and enjoy a personalized shopping experience.
                </p>
              </div>
            )}
            
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b pb-4">
                    <Link 
                      to={`/product/${item.product_id}`}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <CartThumbnail 
                        productId={item.product_id}
                        productImage={item.product_image}
                        productName={item.product_name}
                      />
                    </Link>
                    <div className="flex-1">
                      <Link 
                        to={`/product/${item.product_id}`}
                        className="hover:underline block"
                      >
                        <h4 className="font-medium text-primary hover:text-primary/80">{item.product_name}</h4>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {item.size_name} • {item.color_name}
                      </p>
                      <p className="font-semibold">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && items.length > 0 && (
              <>
                {appliedDiscount && (
                  <div className="space-y-4 border-t pt-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">
                        ✓ {appliedDiscount.code} discount applied! 
                        {appliedDiscount.type === 'percentage' 
                          ? ` ${appliedDiscount.amount}%`
                          : ` ${formatPrice(appliedDiscount.amount)} off`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {user && (
                  <div className="space-y-6 border-t pt-6">
                    <h3 className="text-lg font-semibold">Customer Information</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={customerInfo.fullName}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({ ...prev, fullName: e.target.value }))
                          }
                          placeholder="Enter your full name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={customerInfo.email}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="Enter your email"
                          disabled
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={customerInfo.phone}
                          onChange={(e) =>
                            setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                      <AddressAutocomplete
                        value={shippingAddress}
                        onChange={handleAddressChange}
                      />
                    </div>
                    
                    <Separator />
                    
                    <DeliveryMethodSelector
                      deliveryDetails={deliveryDetails}
                      onDeliveryChange={setDeliveryDetails}
                      shippingAddress={shippingAddress}
                    />
                    
                    {deliveryDetails?.method === 'international_delivery' && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">
  For international delivery inquiries, contact us on{' '}
  <a
    href="https://wa.me/254710573084"
    className="text-primary underline hover:text-primary-dark"
    target="_blank"
    rel="noopener noreferrer"
  >
    WhatsApp
  </a>{' '}
  for delivery pricing and arrangements.
</p>

                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="deliveryReview"
                          checked={deliveryReviewed}
                          onCheckedChange={(checked) => setDeliveryReviewed(!!checked)}
                          className="mt-1"
                        />
                        <Label htmlFor="deliveryReview" className="cursor-pointer">
                          I have reviewed the delivery method and cost
                        </Label>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base">Subtotal:</span>
                          <span className="text-base">{formatPrice(total)}</span>
                        </div>
                        {appliedDiscount && discountAmount > 0 && (
                          <div className="flex items-center justify-between text-green-600">
                            <span className="text-base">Discount ({appliedDiscount.code}):</span>
                            <span className="text-base">-{formatPrice(discountAmount)}</span>
                          </div>
                        )}
                        {deliveryDetails && (
                          <div className="flex items-center justify-between">
                            <span className="text-base">Delivery ({deliveryDetails.method.replace('_', ' ')}):</span>
                            <span className="text-base">{formatPrice(deliveryCost)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">Total:</span>
                          <span className="text-lg font-bold">{formatPrice(finalTotal)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleCheckout} 
                      className="w-full" 
                      size="lg"
                      disabled={!deliveryDetails || !deliveryReviewed}
                    >
                      {deliveryDetails ? 'Place Order' : 'Select Delivery Method'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      <OrderConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={confirmOrder}
        items={items}
        customerInfo={customerInfo}
        shippingAddress={shippingAddress}
        deliveryDetails={deliveryDetails}
        discountCode={appliedDiscount?.code}
        discountAmount={discountAmount}
        total={total}
        deliveryCost={deliveryCost}
        finalTotal={finalTotal}
      />
      
      <PaymentDialog
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onPaymentConfirm={handlePaymentConfirm}
        totalAmount={finalTotal}
        orderNumber={orderNumber}
        userId={user?.id || ''}
        customerInfo={{ fullName: customerInfo.fullName, phone: customerInfo.phone }}
        shippingAddress={{ address: shippingAddress.address, city: shippingAddress.city, postalCode: shippingAddress.postalCode }}
        orderItems={items.map(item => ({
          productId: item.product_id,
          variantId: item.variant_id || null,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.product_image
        }))}
        discountAmount={discountAmount}
        deliveryDetails={deliveryDetails}
      />
    </div>
  );
};

export default Cart;