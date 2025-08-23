import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '@/types/database';
import { MapPin, User, CreditCard, Tag, Truck } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

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

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: CartItem[];
  customerInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    isCurrentLocation: boolean;
  };
  deliveryDetails: DeliveryDetails | null;
  discountCode?: string;
  discountAmount: number;
  total: number;
  deliveryCost: number;
  finalTotal: number;
  isLoading: boolean;
}

const OrderConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  customerInfo,
  shippingAddress,
  deliveryDetails,
  discountCode,
  discountAmount,
  total,
  deliveryCost,
  finalTotal,
  isLoading
}: OrderConfirmationDialogProps) => {
  const { formatPrice } = useCurrency();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-brand">
            Confirm Your Order
          </DialogTitle>
          <DialogDescription>
            Please review your order details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Items */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Order Items ({items.length})
            </h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                  <img
                    src={item.product_image || '/placeholder.svg'}
                    alt={item.product_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.product_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.size} • {item.color} • Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-sm">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            <div className="bg-accent/5 p-4 rounded-lg space-y-2">
              <p><span className="font-medium">Name:</span> {customerInfo.fullName}</p>
              <p><span className="font-medium">Email:</span> {customerInfo.email}</p>
              <p><span className="font-medium">Phone:</span> {customerInfo.phone}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            <div className="bg-accent/5 p-4 rounded-lg">
              <p>{shippingAddress.address}</p>
              <p>{shippingAddress.city}, {shippingAddress.postalCode}</p>
              {shippingAddress.isCurrentLocation && (
                <p className="text-sm text-accent mt-2">📍 Current Location</p>
              )}
            </div>
          </div>

          {/* Delivery Information */}
          {deliveryDetails && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Delivery Information
              </h3>
              <div className="bg-accent/5 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">Method:</span> {deliveryDetails.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p><span className="font-medium">Location:</span> {deliveryDetails.location}</p>
                {deliveryDetails.distanceFromCBD > 0 && (
                  <p><span className="font-medium">Distance from CBD:</span> {deliveryDetails.distanceFromCBD.toFixed(1)} km</p>
                )}
                <p><span className="font-medium">Cost:</span> {formatPrice(deliveryDetails.cost)}</p>
                {deliveryDetails.courierDetails && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-medium mb-2">Courier Details:</p>
                    <p>Name: {deliveryDetails.courierDetails.name}</p>
                    <p>Phone: {deliveryDetails.courierDetails.phone}</p>
                    {deliveryDetails.courierDetails.company && (
                      <p>Company: {deliveryDetails.courierDetails.company}</p>
                    )}
                    {deliveryDetails.courierDetails.pickupWindow && (
                      <p>Pickup Window: {deliveryDetails.courierDetails.pickupWindow}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Order Summary */}
          <div>
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              {discountCode && discountAmount > 0 && (
                <div className="flex justify-between text-accent">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Discount ({discountCode}):
                  </span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              
              {deliveryDetails && (
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>{formatPrice(deliveryCost)}</span>
                </div>
              )}
              
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-brand">{formatPrice(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Review Order
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className="min-w-32">
            {isLoading ? 'Processing...' : 'Confirm Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmationDialog;