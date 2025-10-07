import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import AdminHeader from '@/components/AdminHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Users, DollarSign, Package, Eye, RefreshCw, ChevronRight } from 'lucide-react';
import { format } from "date-fns";
import { OptimizedProductsSection } from '@/components/admin/OptimizedProductsSection';
import NewArrivalsManager from '@/components/admin/NewArrivalsManager';
import SpecialOffersManager from '@/components/admin/SpecialOffersManager';
import FeaturedProductsManager from '@/components/admin/FeaturedProductsManager';
import type { Json } from '@/integrations/supabase/types';
import { cn } from "@/lib/utils"; // Assuming Shadcn utils for classNames
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Updated interfaces to align with revamped DB schema
interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string;
  price: number;
  quantity: number;
  image_url: string | null;
  created_at: string;
}

interface OrderStatus {
  id: string;
  name: string;
  display_name: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status_id: string;
  created_at: string;
  customer_info: Json;
  discount_amount: number;
  order_items: OrderItem[];
  order_status: OrderStatus | null;
}

interface Payment {
  id: number;
  order_id: string | null;
  transaction_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string;
  checkout_request_id: string | null;
  receipt_number: string | null;
  result_desc: string | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

// Status badge variants mapping for better UX
const getStatusVariant = (statusName: string | undefined): "default" | "secondary" | "outline" | "destructive" => {
  switch (statusName) {
    case 'delivered': return 'default';
    case 'shipped': return 'secondary';
    case 'processing': return 'outline';
    case 'pending':
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalCustomers: 0
  });
  const [loadingData, setLoadingData] = useState(true);
  const [statusOptions, setStatusOptions] = useState<OrderStatus[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<string[]>([]);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string | null>(null);
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    await Promise.all([
      fetchStatusOptions(),
      fetchOrders(),
      fetchPayments(),
      fetchPaymentStatuses(),
      fetchCustomers(),
      fetchStats(),
    ]);
    setLoadingData(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          status_id,
          created_at,
          customer_info,
          discount_amount,
          order_status (
            id,
            name,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Fetch order items for each order (optimized: batch if possible, but sequential for simplicity)
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              products!inner (
                name,
                thumbnail_index
              ),
              product_variants!inner (
                additional_price
              )
            `)
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return { ...order, order_items: [] as OrderItem[] };
          }

          // Type assertion for items with joined data
          return { 
            ...order, 
            order_items: itemsData || [] 
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders data",
        variant: "destructive",
      });
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('id, order_id, transaction_id, amount, status, created_at, checkout_request_id, receipt_number, result_desc')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments data",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers data",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Total customers
      const { count: customersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status_id');

      if (ordersError) {
        console.error('Error fetching orders for stats:', ordersError);
      }

      // Payments for revenue
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_records')
        .select('amount, status');

      if (paymentsError) {
        console.error('Error fetching payments for stats:', paymentsError);
      }

      // Get pending status id
      const { data: pendingStatusData, error: pendingStatusError } = await supabase
        .from('order_status')
        .select('id')
        .eq('name', 'pending')
        .single();

      if (pendingStatusError && pendingStatusError.code !== 'PGRST116') {
        console.error('Error fetching pending status:', pendingStatusError);
      }

      const pendingStatusId = pendingStatusData?.id || null;
      
      const totalOrders = ordersData?.length || 0;
      const totalRevenue = paymentsData?.reduce((sum, p) => (p.status === 'Completed' ? sum + Number(p.amount || 0) : sum), 0) || 0;
      
      const pendingOrders = pendingStatusId 
        ? ordersData?.filter(order => order.status_id === pendingStatusId).length || 0
        : 0;

      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        totalCustomers: customersCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Optionally toast here if critical
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('order_status')
        .select('id, name, display_name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setStatusOptions(data || []);
      setPendingStatusId(data?.find(s => s.name.toLowerCase() === 'pending')?.id ?? null);
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  };

  const fetchPaymentStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('distinct status');

      if (error) throw error;
      const statuses = data?.map(d => d.status).filter(Boolean) || [];
      setPaymentStatuses(statuses);
    } catch (error) {
      console.error('Error fetching payment statuses:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatusId: string) => {
  try {
    // First, update the order status in the database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status_id: newStatusId })
      .eq('id', orderId);

    if (updateError) {
      console.error('Update error details:', updateError);
      throw updateError;
    }

    // Fetch the complete order details with related data

    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          variant_id,
          price,
          quantity,
          image_url,
          products (
            name
          ),
          product_variants (
            id,
            sizes (
              name
            ),
            colors (
              name
            )
          )
        ),
        order_status!orders_status_id_fkey (
          name,
          display_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (fetchError || !orderData) {
      console.error('Fetch error:', fetchError);
      throw fetchError || new Error('Order not found');
    }

    // Parse customer info and shipping address
    const customerInfo = orderData.customer_info as { name: string; email: string; phone: string };
    const shippingAddress = orderData.shipping_address as {
      address: string;
      city: string;
      postalCode: string;
      country?: string;
    };

    // Format items for the email
    const formattedItems = orderData.order_items.map((item: any) => ({
      product_name: item.products?.name || 'Unknown Product',
      size: item.product_variants?.size || 'N/A',
      color: item.product_variants?.color || 'N/A',
      quantity: item.quantity,
      price: parseFloat(item.price)
    }));

    // Send the order status update email
    const { data: emailData, error: emailError } = await supabase.functions.invoke(
      'send-order-status-update',
      {
        body: {
          customerEmail: customerInfo.email,
          adminEmail: 'craftsjn@gmail.com',
          orderNumber: orderData.order_number,
          customerName: customerInfo.name,
          orderStatus: orderData.order_status.name,
          items: formattedItems,
          totalAmount: parseFloat(orderData.total_amount),
          discountAmount: parseFloat(orderData.discount_amount || '0'),
          shippingAddress: {
            address: shippingAddress.address,
            city: shippingAddress.city,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country || 'Kenya'
          },
          currency: {
            code: 'KES',
            symbol: 'KSh'
          }
        }
      }
    );

    if (emailError) {
      console.error('Email error:', emailError);
      toast({
        title: 'Status Updated',
        description: 'Order status updated but email notification failed to send.',
        variant: 'default'
      });
    } else {
      console.log('Email sent successfully:', emailData);
      toast({
        title: 'Success',
        description: 'Order status updated and notification sent.',
        variant: 'default'
      });
    }

    // Refresh the orders list
    await fetchOrders();

  } catch (error: any) {
    console.error('Full error in updateOrderStatus:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to update order status',
      variant: 'destructive'
    });
  }
};

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({ title: "Refreshed", description: "Dashboard data updated." });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Stats cards with icons and colors for visual hierarchy
  const statsCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      change: "+12%", // Placeholder; fetch real if needed
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-50",
      onClick: () => {
        setSelectedStatus(null);
        setIsOrdersModalOpen(true);
      }
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: "+8%",
      icon: DollarSign,
      color: "text-green-600 bg-green-50",
      onClick: () => {
        setSelectedPaymentStatus(null);
        setIsPaymentsModalOpen(true);
      }
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      change: "-2%",
      icon: Package,
      color: "text-orange-600 bg-orange-50",
      onClick: () => {
        if (pendingStatusId) setSelectedStatus(pendingStatusId);
        setIsOrdersModalOpen(true);
      }
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      change: "+15%",
      icon: Users,
      color: "text-purple-600 bg-purple-50",
      onClick: () => setIsCustomersModalOpen(true)
    }
  ];

  // Loading skeleton for stats
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );

  // Order card component for better reusability
  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">#{order.order_number}</span>
          <Button 
            variant="ghost" 
            size="sm"
            asChild
          >
            <a href={`/admin/orders/${order.id}`} target="_blank" rel="noopener noreferrer" aria-label="View order details">
              <Eye className="h-4 w-4" />
            </a>
          </Button>
        </div>
        
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
          </p>
          <p className="font-semibold text-base">{formatCurrency(Number(order.total_amount))}</p>
          
          <div className="flex items-center justify-between gap-2">
            <Badge 
              variant={getStatusVariant(order.order_status?.name)}
              className="text-xs"
            >
              {order.order_status?.display_name || 'Unknown'}
            </Badge>
            
            <Select 
              value={order.status_id} 
              onValueChange={(newStatusId) => updateOrderStatus(order.id, newStatusId)}
            >
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Items: {order.order_items.length}</p>
            {order.discount_amount > 0 && (
              <p>Discount: {formatCurrency(Number(order.discount_amount))}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          <Skeleton className="h-12 w-64" />
          <StatsSkeleton />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const displayedOrders = orders.filter((order) => !selectedStatus || order.status_id === selectedStatus);
  const displayedPayments = payments.filter((payment) => !selectedPaymentStatus || payment.status === selectedPaymentStatus);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your store, orders, and products efficiently</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards - Responsive grid with hover effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card 
              key={index} 
              className={cn(
                "hover:shadow-lg transition-all duration-200",
                stat.onClick ? "cursor-pointer" : ""
              )}
              onClick={stat.onClick}
            >
              <div className="p-6 space-y-3 relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">Change: <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>{stat.change}</span></p>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs - Improved spacing and focus */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full h-12">
            <TabsTrigger value="orders" className="data-[state=active]:shadow-md">Orders</TabsTrigger>
            {/* <TabsTrigger value="products" className="data-[state=active]:shadow-md">Products</TabsTrigger>
            <TabsTrigger value="new-arrivals" className="data-[state=active]:shadow-md">New Arrivals</TabsTrigger>
            <TabsTrigger value="featured" className="data-[state=active]:shadow-md">Featured</TabsTrigger>
            <TabsTrigger value="offers" className="data-[state=active]:shadow-md">Special Offers</TabsTrigger> */}
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Track and manage recent customer orders</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <a href="/admin/orders" className="flex items-center gap-1">
                    View All <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent orders found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.slice(0, 10).map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="products" className="space-y-6">
            <OptimizedProductsSection onOpenProductDialog={() => {}} onEditProduct={() => {}} />
          </TabsContent>

          <TabsContent value="new-arrivals" className="space-y-6">
            <NewArrivalsManager />
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <FeaturedProductsManager />
          </TabsContent>

          <TabsContent value="offers" className="space-y-6">
            <SpecialOffersManager />
          </TabsContent> */}
        </Tabs>
      </div>

      {/* Orders Modal */}
      <Dialog open={isOrdersModalOpen} onOpenChange={setIsOrdersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {displayedOrders.length} orders
              </p>
              <Select
                value={selectedStatus ?? 'all'}
                onValueChange={(value) => setSelectedStatus(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {displayedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders match the selected filter</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>{formatCurrency(Number(order.total_amount))}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.order_status?.name)}>
                          {order.order_status?.display_name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`/admin/orders/${order.id}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Select
                          value={order.status_id}
                          onValueChange={(newStatusId) => updateOrderStatus(order.id, newStatusId)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                {status.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payments Modal */}
      <Dialog open={isPaymentsModalOpen} onOpenChange={setIsPaymentsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Records</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {displayedPayments.length} payments
              </p>
              <Select
                value={selectedPaymentStatus ?? 'all'}
                onValueChange={(value) => setSelectedPaymentStatus(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {paymentStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {displayedPayments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments match the selected filter</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Checkout Request ID</TableHead>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>Result Desc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.id}</TableCell>
                      <TableCell>{payment.order_id || 'N/A'}</TableCell>
                      <TableCell>{payment.transaction_id || 'N/A'}</TableCell>
                      <TableCell>{payment.amount ? formatCurrency(payment.amount) : 'N/A'}</TableCell>
                      <TableCell>{payment.status || 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>{payment.checkout_request_id || 'N/A'}</TableCell>
                      <TableCell>{payment.receipt_number || 'N/A'}</TableCell>
                      <TableCell>{payment.result_desc || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customers Modal */}
      <Dialog open={isCustomersModalOpen} onOpenChange={setIsCustomersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing {customers.length} customers
            </p>
            {customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No customers found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.id}</TableCell>
                      <TableCell>{customer.name || 'N/A'}</TableCell>
                      <TableCell>{customer.email || 'N/A'}</TableCell>
                      <TableCell>{format(new Date(customer.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;