import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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
  Printer,
  Download,
  Receipt
} from 'lucide-react';
import { 
  printInvoice, 
  exportInvoicePDF, 
  exportReceiptPDF, 
  getCompanyInfo,
  type InvoiceData 
} from '@/lib/invoice-utils';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string;
  color_name: string;
  size_name: string;
  price: number;
  quantity: number;
  image_url: string | null;
}

interface OrderStatus {
  id: string;
  name: string;
  display_name: string;
  description?: string;
}

interface Order {
  id: string;
  order_number: string;
  status_id: string;
  total_amount: number;
  discount_amount: number;
  discount_id: string | null;
  shipping_address: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  } | null;
  customer_info: {
    fullName: string;
    email: string;
    phone: string;
    notes?: string;
  };
  created_at: string;
  updated_at: string;
  delivery_details: {
    cost: number;
    method: string;
    location: string;
    courierDetails?: {
      name: string;
      phone: string;
      company: string;
      pickupWindow: string;
    };
    distanceFromCBD?: number;
  } | null;
  transaction_code?: string | null;
  status_name: string;
  status_display_name: string;
  discount_name?: string;
  discount_code?: string;
  order_items: OrderItem[];
}

const AdminOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<OrderStatus[]>([]);
  const [processingDocument, setProcessingDocument] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (id && isAdmin) {
      fetchOrder();
      fetchStatusOptions();
    }
  }, [id, isAdmin]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_status!orders_status_id_fkey (
            name,
            display_name
          ),
          order_items (
            id,
            product_id,
            variant_id,
            price,
            quantity,
            image_url,
            products!inner (
              name
            ),
            product_variants!inner (
              id,
              sizes (
                name
              ),
              colors (
                name
              )
            )
          ),
          discounts (
            name,
            code
          )
        `)
        .eq('id', id)
        .single();

      if (orderError || !orderData) {
        console.error('Error fetching order:', orderError);
        throw orderError || new Error('Order not found');
      }

      const mappedOrder: Order = {
        id: orderData.id,
        order_number: orderData.order_number,
        status_id: orderData.status_id,
        total_amount: Number(orderData.total_amount),
        discount_amount: Number(orderData.discount_amount),
        discount_id: orderData.discount_id,
        shipping_address: orderData.shipping_address,
        customer_info: orderData.customer_info,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        delivery_details: orderData.delivery_details,
        transaction_code: orderData.transaction_code,
        status_name: orderData.order_status?.name || '',
        status_display_name: orderData.order_status?.display_name || '',
        discount_name: orderData.discounts?.name,
        discount_code: orderData.discounts?.code,
        order_items: orderData.order_items.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name || 'Unknown Product',
          variant_id: item.variant_id,
          color_name: item.product_variants?.colors?.name || 'N/A',
          size_name: item.product_variants?.sizes?.name || 'N/A',
          price: Number(item.price),
          quantity: item.quantity,
          image_url: item.image_url
        }))
      };

      setOrder(mappedOrder);
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch order details",
        variant: "destructive",
      });
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('order_status')
        .select('id, name, display_name, description')
        .eq('is_active', true)
        .order('display_order');

      if (statusError) throw statusError;
      setAvailableStatuses(statusData || []);
    } catch (error: any) {
      console.error('Failed to fetch status options:', error);
    }
  };

  const updateOrderStatus = async (newStatusId: string) => {
    if (!order || !user?.id) return;
    
    setUpdatingStatus(true);
    try {
      const { data: newStatus, error: statusError } = await supabase
        .from('order_status')
        .select('name, display_name')
        .eq('id', newStatusId)
        .single();

      if (statusError || !newStatus) {
        throw new Error('Failed to fetch status details');
      }

      console.log('Updating order status via Edge Function:', { 
        orderId: order.id, 
        newStatusId, 
        statusName: newStatus?.name 
      });

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const { data: functionResult, error: functionError } = await supabase.functions.invoke(
        'update-order-status',
        {
          body: {
            orderId: order.id,
            statusId: newStatusId,
            statusName: newStatus.name,
            statusDisplayName: newStatus.display_name,
            customerEmail: order.customer_info?.email,
            orderNumber: order.order_number,
            customerName: order.customer_info?.fullName,
            orderItems: order.order_items.map((item) => ({
              product_name: item.product_name,
              quantity: item.quantity,
              size: item.size_name,
              color: item.color_name,
              price: item.price
            })),
            totalAmount: order.total_amount,
            discountAmount: order.discount_amount,
            discountName: order.discount_name,
            shippingAddress: order.shipping_address
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (functionError) {
        console.error('Edge Function failed:', functionError);
        throw new Error(functionError.message || 'Failed to update via Edge Function');
      }

      console.log('Edge Function result:', functionResult);

      await fetchOrder();
      
      toast({
        title: "Order Updated",
        description: `Status changed to ${newStatus?.display_name}`,
      });
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update order status"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (statusName: string | undefined) => {
    switch (statusName) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePrintInvoice = async () => {
    if (!order || !user?.id) return;
    
    setProcessingDocument('print');
    try {
      const orderId = order.id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
        throw new Error('Invalid order ID');
      }
      const invoiceNumber = await printInvoice(orderId, user.id);
      toast({
        title: "Invoice Printed",
        description: `Invoice ${invoiceNumber} ready for printing`,
      });
    } catch (error: any) {
      console.error('Error printing invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to print invoice"
      });
    } finally {
      setProcessingDocument(null);
    }
  };

  const handleExportInvoice = async () => {
    if (!order || !user?.id) return;
    
    setProcessingDocument('invoice');
    try {
      const orderId = order.id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
        throw new Error('Invalid order ID');
      }
      const invoiceNumber = await exportInvoicePDF(orderId, user.id);
      toast({
        title: "Invoice Exported",
        description: `Invoice ${invoiceNumber} downloaded`,
      });
    } catch (error: any) {
      console.error('Error exporting invoice:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to export invoice"
      });
    } finally {
      setProcessingDocument(null);
    }
  };

  const handleExportReceipt = async () => {
    if (!order || !user?.id) return;
    
    setProcessingDocument('receipt');
    try {
      const orderId = order.id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
        throw new Error('Invalid order ID');
      }
      const receiptNumber = await exportReceiptPDF(orderId, user.id);
      toast({
        title: "Receipt Exported",
        description: `Receipt ${receiptNumber} downloaded`,
      });
    } catch (error: any) {
      console.error('Error exporting receipt:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to export receipt"
      });
    } finally {
      setProcessingDocument(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Order Not Found</h1>
          <Button onClick={() => navigate('/admin')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <Breadcrumb className="lg:w-auto">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Order #{order.order_number}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Badge 
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full",
                getStatusColor(order.status_name)
              )}
            >
              {order.status_display_name?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm">{order.customer_info?.fullName || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm break-all">{order.customer_info?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{order.customer_info?.phone || 'N/A'}</span>
                    </div>
                    {order.transaction_code && (
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <Badge variant="default" className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1">
                          {order.transaction_code} (M-Pesa)
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Shipping Address
                    </h4>
                    <div className="text-sm space-y-1 pl-6">
                      {order.shipping_address?.street && <div>{order.shipping_address.street}</div>}
                      {order.shipping_address?.city && (
                        <div>
                          {order.shipping_address.city}
                          {order.shipping_address.postalCode && `, ${order.shipping_address.postalCode}`}
                        </div>
                      )}
                      {order.shipping_address?.country && <div>{order.shipping_address.country}</div>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items ({order.order_items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground absolute inset-0 m-auto" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Size: <Badge variant="outline" className="text-xs px-2 py-0.5 ml-1">{item.size_name}</Badge> • 
                          Color: <Badge variant="secondary" className="text-xs px-2 py-0.5 ml-1">{item.color_name}</Badge>
                        </div>
                      </div>
                      <div className="text-center flex-shrink-0">
                        <div className="font-medium text-sm">x{item.quantity}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(item.price)} ea.</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-sm">
                          {formatCurrency(item.price * item.quantity)}
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
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {order.delivery_details.method && (
                      <div>
                        <span className="font-medium text-muted-foreground">Delivery Method:</span>
                        <div className="mt-1 font-medium">{order.delivery_details.method}</div>
                      </div>
                    )}
                    {order.delivery_details.cost !== undefined && (
                      <div>
                        <span className="font-medium text-muted-foreground">Delivery Fee:</span>
                        <div className="mt-1 font-medium">{formatCurrency(order.delivery_details.cost)}</div>
                      </div>
                    )}
                    {order.delivery_details.courierDetails && (
                      <>
                        {order.delivery_details.courierDetails.company && (
                          <div>
                            <span className="font-medium text-muted-foreground">Courier Company:</span>
                            <div className="mt-1 font-medium">{order.delivery_details.courierDetails.company}</div>
                          </div>
                        )}
                        {order.delivery_details.courierDetails.name && (
                          <div>
                            <span className="font-medium text-muted-foreground">Courier Name:</span>
                            <div className="mt-1 font-medium">{order.delivery_details.courierDetails.name}</div>
                          </div>
                        )}
                        {order.delivery_details.courierDetails.phone && (
                          <div>
                            <span className="font-medium text-muted-foreground">Courier Phone:</span>
                            <div className="mt-1 font-medium">{order.delivery_details.courierDetails.phone}</div>
                          </div>
                        )}
                        {order.delivery_details.courierDetails.pickupWindow && (
                          <div>
                            <span className="font-medium text-muted-foreground">Pickup Window:</span>
                            <div className="mt-1 font-medium">{order.delivery_details.courierDetails.pickupWindow}</div>
                          </div>
                        )}
                      </>
                    )}
                    {order.delivery_details.location && (
                      <div>
                        <span className="font-medium text-muted-foreground">Location:</span>
                        <div className="mt-1 font-medium">{order.delivery_details.location}</div>
                      </div>
                    )}
                    {order.delivery_details.distanceFromCBD !== undefined && (
                      <div>
                        <span className="font-medium text-muted-foreground">Distance from CBD:</span>
                        <div className="mt-1 font-medium">{order.delivery_details.distanceFromCBD} km</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(order.discount_id || order.customer_info?.notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.discount_id && order.discount_name && (
                    <div>
                      <span className="font-medium">Discount Applied:</span>
                      <Badge variant="secondary" className="ml-2 text-xs">{order.discount_name} ({order.discount_code})</Badge>
                      <div className="text-sm text-muted-foreground mt-1">{formatCurrency(-order.discount_amount)}</div>
                    </div>
                  )}
                  {order.customer_info?.notes && (
                    <div>
                      <span className="font-medium">Customer Note:</span>
                      <div className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-lg italic">
                        {order.customer_info.notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="font-mono">#{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(order.created_at).toLocaleDateString('en-KE')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment:</span>
                    <Badge variant={order.status_name === 'delivered' ? 'default' : 'secondary'}>
                      {order.status_name === 'delivered' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                <hr className="my-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.total_amount + order.discount_amount)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>{formatCurrency(-order.discount_amount)}</span>
                    </div>
                  )}
                  {order.delivery_details?.cost !== undefined && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>{formatCurrency(order.delivery_details.cost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider">Status</Label>
                  <Select
                    value={order.status_id}
                    onValueChange={updateOrderStatus}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={order.status_display_name} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-xs gap-2"
                    onClick={handlePrintInvoice}
                    disabled={processingDocument === 'print'}
                  >
                    <Printer className="h-4 w-4" />
                    {processingDocument === 'print' ? 'Printing...' : 'Print Invoice'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-xs gap-2"
                    onClick={handleExportInvoice}
                    disabled={processingDocument === 'invoice'}
                  >
                    <Download className="h-4 w-4" />
                    {processingDocument === 'invoice' ? 'Exporting...' : 'Export Invoice'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-xs gap-2"
                    onClick={handleExportReceipt}
                    disabled={processingDocument === 'receipt'}
                  >
                    <Receipt className="h-4 w-4" />
                    {processingDocument === 'receipt' ? 'Exporting...' : 'Export Receipt'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;