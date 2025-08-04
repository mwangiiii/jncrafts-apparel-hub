import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, ShoppingBag, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OrderConfirmationDialog from "./OrderConfirmationDialog";

import { CartItem } from "@/types/database";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

const Cart = ({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onClearCart }: CartProps) => {
  const [customerInfo, setCustomerInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [shippingAddress, setShippingAddress] = useState({
    address: "",
    city: "",
    postalCode: "",
    isCurrentLocation: false,
  });
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? (total * appliedDiscount.amount) / 100
      : appliedDiscount.amount
    : 0;
  const finalTotal = Math.max(0, total - discountAmount);

  useEffect(() => {
    if (user && isOpen) {
      // Auto-fill user information
      setCustomerInfo(prev => ({
        ...prev,
        email: user.email || "",
      }));
    }
  }, [user, isOpen]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // In a real app, you'd use a geocoding service to convert coordinates to address
            setShippingAddress(prev => ({
              ...prev,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              city: "Auto-detected",
              postalCode: "00000",
              isCurrentLocation: true,
            }));
            toast({
              title: "Location detected",
              description: "Your current location has been set as the delivery address.",
            });
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to get your location details.",
            });
          }
        },
        (error) => {
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Unable to access your location. Please enter your address manually.",
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
      });
    }
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    
    setLoadingDiscount(true);
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
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
          description: `This discount requires a minimum order of $${data.min_order_amount}.`,
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
        description: `${data.name} - ${data.discount_type === 'percentage' ? `${data.discount_value}%` : `$${data.discount_value}`} off`,
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

    setShowConfirmation(true);
  };

  const confirmOrder = async () => {
    setIsPlacingOrder(true);
    try {
      // Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_order_number');

      // Create order
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
        size: item.size,
        color: item.color,
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

      toast({
        title: "Order Placed Successfully!",
        description: `Your order ${orderNumber} has been placed. We'll send you updates via email.`,
      });

      // Reset everything
      onClearCart();
      setCustomerInfo({ fullName: "", email: user?.email || "", phone: "" });
      setShippingAddress({ address: "", city: "", postalCode: "", isCurrentLocation: false });
      setDiscountCode("");
      setAppliedDiscount(null);
      setShowConfirmation(false);
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
                  <img 
                    src={item.product_image || '/placeholder.svg'} 
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.size} • {item.color}
                    </p>
                    <p className="font-semibold">${item.price}</p>
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
                          : ` $${appliedDiscount.amount} off`
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
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={getCurrentLocation}
                            className="flex items-center gap-2"
                          >
                            <MapPin className="h-4 w-4" />
                            Use Current Location
                          </Button>
                          {shippingAddress.isCurrentLocation && (
                            <span className="text-sm text-green-600">📍 Location detected</span>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="address">Street Address</Label>
                          <Input
                            id="address"
                            value={shippingAddress.address}
                            onChange={(e) =>
                              setShippingAddress((prev) => ({ ...prev, address: e.target.value, isCurrentLocation: false }))
                            }
                            placeholder="Enter your street address"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={shippingAddress.city}
                              onChange={(e) =>
                                setShippingAddress((prev) => ({ ...prev, city: e.target.value, isCurrentLocation: false }))
                              }
                              placeholder="City"
                            />
                          </div>
                          <div>
                            <Label htmlFor="postalCode">Postal Code</Label>
                            <Input
                              id="postalCode"
                              value={shippingAddress.postalCode}
                              onChange={(e) =>
                                setShippingAddress((prev) => ({ ...prev, postalCode: e.target.value, isCurrentLocation: false }))
                              }
                              placeholder="Postal Code"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base">Subtotal:</span>
                        <span className="text-base">${total.toFixed(2)}</span>
                      </div>
                      {appliedDiscount && discountAmount > 0 && (
                        <div className="flex items-center justify-between text-green-600">
                          <span className="text-base">Discount ({appliedDiscount.code}):</span>
                          <span className="text-base">-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">Total:</span>
                        <span className="text-lg font-bold">${finalTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <Button onClick={handleCheckout} className="w-full" size="lg">
                      Place Order
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
        discountCode={appliedDiscount?.code}
        discountAmount={discountAmount}
        total={total}
        finalTotal={finalTotal}
        isLoading={isPlacingOrder}
      />
    </div>
  );
};

export default Cart;