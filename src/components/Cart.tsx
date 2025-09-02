import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingBag, Plus, Minus, Trash2, User, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OrderConfirmationDialog from './OrderConfirmationDialog';
import DeliveryMethodSelector from './DeliveryMethodSelector';
import AddressAutocomplete from './AddressAutocomplete';
import MpesaPaymentDialog from './MpesaPaymentDialog';

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
}

const Cart = ({ isOpen, onClose, items = [], onUpdateQuantity, onRemoveItem, onClearCart }: CartProps) => {
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
  const [showMpesaPayment, setShowMpesaPayment] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const { user } = useAuth();
  const { formatPrice, selectedCurrency } = useCurrency();
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
      // Auto-fill user information
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
      const { data, error } = await supabase
        .from('discounts')
        .select('id, code, name, discount_type, discount_value, min_order_amount, max_uses, current_uses')
        .eq('code', discountCode.toUpperCase())
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "The discount code is invalid or has expired.",
        });
        return;
      }

      if (data.min_order_amount && total < data.min_order_amount) {
        toast({
          variant: "destructive",
          title: "Minimum Order Required",
          description: `This discount requires a minimum order of ${formatPrice(data.min_order_amount)}.`,
        });
        return;
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({
          variant: "destructive",
          title: "Code Expired",
          description: "This discount code has reached its usage limit.",
        });
        return;
      }

      setAppliedDiscount({
        code: data.code,
        amount: data.discount_value,
        type: data.discount_type as 'percentage' | 'fixed',
      });

      toast({
        title: "Discount Applied!",
        description: `${data.name} - ${data.discount_type === 'percentage' ? `${data.discount_value}%` : `${formatPrice(data.discount_value)}`} off`,
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
        description: "Please fill in all customer information fields.",
      });
      return;
    }

    if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode) {
      toast({
        variant: "destructive",
        title: "Missing Address",
        description: "Please provide a complete shipping address.",
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

    setShowConfirmation(true);
  };

  const confirmOrder = () => {
    setShowConfirmation(false);
    setShowMpesaPayment(true);
  };

  const handlePaymentConfirm = async (transactionCode: string) => {
    setIsPlacingOrder(true);
    try {
      // Generate order number client-side to avoid RPC issues
      const timestamp = Date.now();
      const orderNumber = `JNC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${timestamp.toString().slice(-10)}`;

      // Create order with transaction code
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          order_number: orderNumber,
          total_amount: finalTotal,
          discount_amount: discountAmount,
          discount_code: appliedDiscount?.code || null,
          customer_info: customerInfo,
          shipping_address: shippingAddress,
          delivery_details: deliveryDetails as any,
          transaction_code: transactionCode,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        product_image: item.product_image,
        price: item.price,
        quantity: item.quantity,
        size: item.size_name,
        color: item.color_name,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update discount usage if applicable
      if (appliedDiscount) {
        const { data: currentDiscount } = await supabase
          .from('discounts')
          .select('current_uses')
          .eq('code', appliedDiscount.code)
          .single();
        
        if (currentDiscount) {
          await supabase
            .from('discounts')
            .update({ current_uses: (currentDiscount.current_uses || 0) + 1 })
            .eq('code', appliedDiscount.code);
        }
      }

      // Send order confirmation email
      try {
        await supabase.functions.invoke('send-order-status-update', {
          body: {
            customerEmail: customerInfo.email,
            adminEmail: "craftsjn@gmail.com",
            orderNumber: orderNumber,
            customerName: customerInfo.fullName,
            orderStatus: 'pending',
            items: items.map(item => ({
              product_name: item.product_name,
              quantity: item.quantity,
              size: item.size_name,
              color: item.color_name,
              price: item.price
            })),
            totalAmount: finalTotal,
            discountAmount: discountAmount,
            shippingAddress: shippingAddress,
            currency: {
              code: selectedCurrency.code,
              symbol: selectedCurrency.symbol
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending order confirmation email:', emailError);
      }

      // Send admin notification for new order
      try {
        console.log('Order placed successfully, emails sent via order status update function');
      } catch (emailError) {
        console.error('Error in email notifications:', emailError);
      }

        // Send WhatsApp notification for international orders
        if (deliveryDetails?.method === 'international_delivery') {
          try {
            const whatsappNotification = await supabase.functions.invoke('send-whatsapp-notification', {
              body: {
                type: 'international_order',
                orderDetails: {
                  orderNumber: orderNumber,
                  customerName: customerInfo.fullName,
                  customerEmail: customerInfo.email,
                  items: items.map(item => ({
                    product_name: item.product_name,
                    quantity: item.quantity,
                    size: item.size_name,
                    color: item.color_name,
                    price: item.price
                  })),
                  totalAmount: finalTotal,
                  shippingAddress: {
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    postalCode: shippingAddress.postalCode
                  },
                  deliveryMethod: deliveryDetails.method
                }
              }
            });

            if (whatsappNotification.data?.whatsappUrl) {
              // Open WhatsApp with pre-filled message
              window.open(whatsappNotification.data.whatsappUrl, '_blank');
            }
          } catch (whatsappError) {
            console.error('WhatsApp notification error:', whatsappError);
            // Don't fail the order if WhatsApp fails
          }
        }

      toast({
        title: "Order Placed Successfully!",
        description: `Your order ${orderNumber} has been placed with M-Pesa transaction code ${transactionCode}.`,
      });

      // Reset everything
      onClearCart();
      setCustomerInfo({ fullName: "", email: user?.email || "", phone: "" });
      setShippingAddress({ address: "", city: "", postalCode: "", lat: undefined, lon: undefined, isCurrentLocation: false });
      setDiscountCode("");
      setAppliedDiscount(null);
      setDeliveryDetails(null);
      setShowConfirmation(false);
      setShowMpesaPayment(false);
      onClose();
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: "There was an error placing your order. Please try again.",
      });
    } finally {
      setIsPlacingOrder(false);
    }
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
                  <span className="font-medium">Login Required</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Please log in to place an order and enjoy a personalized shopping experience.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 border-b pb-4">
                  <a 
                    href={`/product/${item.product_id}`}
                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `/product/${item.product_id}`;
                    }}
                  >
                    <img 
                      src={item.product_image || '/placeholder.svg'} 
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  </a>
                  <div className="flex-1">
                    <a 
                      href={`/product/${item.product_id}`}
                      className="hover:underline block"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/product/${item.product_id}`;
                      }}
                    >
                      <h4 className="font-medium text-primary hover:text-primary/80">{item.product_name}</h4>
                    </a>
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

            {items.length === 0 && (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            )}

            {items.length > 0 && (
              <>
                {/* Discount applied by manager will show here */}
                {appliedDiscount && (
                  <div className="space-y-4 border-t pt-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-700">
                        ✓ {appliedDiscount.code} discount applied! 
                        {appliedDiscount.type === 'percentage' 
                          ? ` ${appliedDiscount.amount}% off`
                          : ` ${formatPrice(appliedDiscount.amount)} off`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Checkout Form */}
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
                    
                    {/* Delivery Method Selection */}
                    <DeliveryMethodSelector
                      deliveryDetails={deliveryDetails}
                      onDeliveryChange={setDeliveryDetails}
                      shippingAddress={shippingAddress}
                    />
                    
                    <Separator />
                    
                    <div className="space-y-2">
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
                    
                    <Button 
                      onClick={handleCheckout} 
                      className="w-full" 
                      size="lg"
                      disabled={!deliveryDetails}
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
        isLoading={isPlacingOrder}
      />
      
      <MpesaPaymentDialog
        isOpen={showMpesaPayment}
        onClose={() => setShowMpesaPayment(false)}
        onPaymentConfirm={handlePaymentConfirm}
        totalAmount={finalTotal}
        orderNumber="pending"
        isProcessing={isPlacingOrder}
      />
    </div>
  );
};

export default Cart;