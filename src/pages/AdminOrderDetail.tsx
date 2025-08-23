import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  Calendar, 
  DollarSign, 
  Truck, 
  MessageSquare,
  FileText,
  CheckCircle,
  Clock,
  X,
  Edit,
  Printer
} from 'lucide-react';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  discount_code: string | null;
  customer_info: any;
  shipping_address: any;
  delivery_details: any;
  created_at: string;
  order_items: any[];
}

const AdminOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (orderId && isAdmin) {
      fetchOrder();
    }
  }, [orderId, isAdmin]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch order details"
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      // Send status update email
      try {
        await supabase.functions.invoke('send-order-email', {
          body: {
            email: order.customer_info.email,
            orderNumber: order.order_number,
            customerName: order.customer_info.fullName,
            orderStatus: newStatus,
            items: order.order_items.map((item: any) => ({
              product_name: item.product_name,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              price: item.price
            })),
            totalAmount: order.total_amount,
            discountAmount: order.discount_amount,
            shippingAddress: order.shipping_address,
            currency: {
              code: 'KES',
              symbol: 'KSh'
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }

      setOrder({ ...order, status: newStatus });
      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}. Customer has been notified.`
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500';
      case 'confirmed': return 'bg-blue-500';
      case 'processing': return 'bg-orange-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailableStatusOptions = (currentStatus: string) => {
    const statusFlow = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: ['pending'] // Can revive cancelled orders
    };
    return statusFlow[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold">Order Not Found</h1>
          <Button onClick={() => navigate('/admin')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header with Breadcrumbs */}
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Order #{order.order_number}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Order #{order.order_number}</h1>
              <p className="text-muted-foreground">
                Placed on {new Date(order.created_at).toLocaleDateString()} at{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(order.status)} text-white px-4 py-2`}>
              {order.status.toUpperCase()}
            </Badge>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.customer_info?.fullName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer_info?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer_info?.phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Shipping Address
                    </h4>
                    <div className="text-sm text-muted-foreground pl-6">
                      {order.shipping_address?.street && <div>{order.shipping_address.street}</div>}
                      {order.shipping_address?.city && <div>{order.shipping_address.city}</div>}
                      {order.shipping_address?.state && <div>{order.shipping_address.state}</div>}
                      {order.shipping_address?.zipCode && <div>{order.shipping_address.zipCode}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Ordered */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products Ordered ({order.order_items?.length || 0} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Link 
                        to={`/admin/products`}
                        className="font-medium hover:text-primary transition-colors cursor-pointer"
                      >
                        {item.product_name}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        Size: {item.size} • Color: {item.color}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">Qty: {item.quantity}</div>
                      <div className="text-sm text-muted-foreground">
                        KSh {item.price?.toLocaleString()} each
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        KSh {(item.price * item.quantity)?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Details */}
          {order.delivery_details && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Delivery Method:</span>
                    <div className="text-sm text-muted-foreground">
                      {order.delivery_details?.method || 'Standard Delivery'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Delivery Cost:</span>
                    <div className="text-sm text-muted-foreground">
                      KSh {order.delivery_details?.cost?.toLocaleString() || '0'}
                    </div>
                  </div>
                  {order.delivery_details?.distance && (
                    <div>
                      <span className="font-medium">Distance:</span>
                      <div className="text-sm text-muted-foreground">
                        {order.delivery_details.distance} km
                      </div>
                    </div>
                  )}
                  {order.delivery_details?.courier && (
                    <div>
                      <span className="font-medium">Courier:</span>
                      <div className="text-sm text-muted-foreground">
                        {order.delivery_details.courier}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Notes */}
          {(order.discount_code || order.customer_info?.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Special Notes & Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.discount_code && (
                  <div>
                    <span className="font-medium">Promo Code Applied:</span>
                    <Badge variant="secondary" className="ml-2">{order.discount_code}</Badge>
                  </div>
                )}
                {order.customer_info?.notes && (
                  <div>
                    <span className="font-medium">Customer Message:</span>
                    <div className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-lg">
                      {order.customer_info.notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-medium">#{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">Cash on Delivery</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                    {order.status === 'delivered' ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              </div>
              
              <hr />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>KSh {(order.total_amount + (order.discount_amount || 0)).toLocaleString()}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-KSh {order.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>KSh {order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Update Status:</label>
                <Select
                  value={order.status}
                  onValueChange={updateOrderStatus}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={order.status}>{order.status.toUpperCase()}</SelectItem>
                    {getAvailableStatusOptions(order.status).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Printer className="h-4 w-4 mr-2" />
                  Export Invoice
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Export Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;