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
import { format, isValid } from "date-fns";
import { OptimizedProductsSection } from '@/components/admin/OptimizedProductsSection';
import NewArrivalsManager from '@/components/admin/NewArrivalsManager';
import SpecialOffersManager from '@/components/admin/SpecialOffersManager';
import FeaturedProductsManager from '@/components/admin/FeaturedProductsManager';
import type { Json } from '@/integrations/supabase/types';
import { cn } from "@/lib/utils";
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

// Interfaces
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
  full_name: string | null;
  email: string | null;
  created_at: string;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

// Helper function to safely format dates
const formatSafeDate = (dateValue: any, formatString: string = 'MMM dd, yyyy HH:mm'): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = new Date(dateValue);
    if (isValid(date)) {
      return format(date, formatString);
    }
  } catch (e) {
    console.error('Error formatting date:', dateValue, e);
  }
  
  return 'N/A';
};

// Status badge variants mapping for better UX
const getStatusVariant = (statusName: string | undefined): "default" | "secondary" | "outline" | "destructive" => {
  switch (statusName?.toLowerCase()) {
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

  // Site lock state
  const [siteLock, setSiteLock] = useState<{ status: boolean; unlock_at: string | null }>({ status: false, unlock_at: null });
  const [lockLoading, setLockLoading] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [unlockInput, setUnlockInput] = useState<string>("");

  // Fetch current lock state
  useEffect(() => {
    const fetchLock = async () => {
      setLockLoading(true);
      setLockError(null);
      const { data, error } = await supabase
        .from("system_status")
        .select("status, unlock_at")
        .order("id", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        setSiteLock({ status: data.status, unlock_at: data.unlock_at });
        setUnlockInput(data.unlock_at ? data.unlock_at.slice(0, 16) : "");
      } else {
        setSiteLock({ status: false, unlock_at: null });
        setUnlockInput("");
      }
      setLockLoading(false);
    };
    fetchLock();
  }, []);

  // Admin action: lock/unlock site
  const handleLockChange = async (lock: boolean) => {
    setLockLoading(true);
    setLockError(null);
    const { error } = await supabase.from("system_status").insert({ status: lock, unlock_at: lock ? (unlockInput ? new Date(unlockInput).toISOString() : null) : null });
    if (error) {
      setLockError("Failed to update lock status");
    } else {
      setSiteLock({ status: lock, unlock_at: lock ? (unlockInput ? new Date(unlockInput).toISOString() : null) : null });
    }
    setLockLoading(false);
  };

  // Admin action: set unlock time
  const handleUnlockTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnlockInput(e.target.value);
  };

  const handleSaveUnlockTime = async () => {
    setLockLoading(true);
    setLockError(null);
    const { error } = await supabase.from("system_status").insert({ status: true, unlock_at: unlockInput ? new Date(unlockInput).toISOString() : null });
    if (error) {
      setLockError("Failed to set unlock time");
    } else {
      setSiteLock({ status: true, unlock_at: unlockInput ? new Date(unlockInput).toISOString() : null });
    }
    setLockLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      await Promise.all([
        fetchStatusOptions(),
        fetchOrders(),
        fetchPayments(),
        fetchPaymentStatuses(),
        fetchCustomers(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
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

      if (ordersError) throw ordersError;

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
        .rpc('get_profiles_with_email');

      if (error) throw error;

      const formattedCustomers = data.map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name || 'N/A',
        email: profile.email || 'N/A',
        created_at: profile.created_at,
      }));

      setCustomers(formattedCustomers);
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      const { count: customersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status_id');

      if (ordersError) throw ordersError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_records')
        .select('amount, status');

      if (paymentsError) throw paymentsError;

      const { data: pendingStatusData, error: pendingStatusError } = await supabase
        .from('order_status')
        .select('id')
        .eq('name', 'pending')
        .single();

      if (pendingStatusError && pendingStatusError.code !== 'PGRST116') {
        throw pendingStatusError;
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
      toast({
        title: "Error",
        description: "Failed to fetch stats data",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to fetch status options",
        variant: "destructive",
      });
    }
  };

  const fetchPaymentStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('status')
        .not('status', 'is', null);

      if (error) throw error;
      
      // Get unique statuses manually
      const uniqueStatuses = [...new Set(data?.map(d => d.status).filter(Boolean) || [])];
      setPaymentStatuses(uniqueStatuses);
    } catch (error) {
      console.error('Error fetching payment statuses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment statuses",
        variant: "destructive",
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatusId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status_id: newStatusId })
        .eq('id', orderId);

      if (updateError) throw updateError;

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
        throw fetchError || new Error('Order not found');
      }

      const customerInfo = orderData.customer_info as { name: string; email: string; phone: string };
      const shippingAddress = orderData.shipping_address as {
        address: string;
        city: string;
        postalCode: string;
        country?: string;
      };

      const formattedItems = orderData.order_items.map((item: any) => ({
        product_name: item.products?.name || 'Unknown Product',
        size: item.product_variants?.size || 'N/A',
        color: item.product_variants?.color || 'N/A',
        quantity: item.quantity,
        price: parseFloat(item.price)
      }));

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
    return `Ksh ${Math.round(amount).toLocaleString('en-KE')}`;
  };

  const statsCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
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
      icon: Package,
      color: "text-orange-600 bg-orange-50",
      onClick: () => {
        if (pendingStatusId) setSelectedStatus(pendingStatusId);
        setIsOrdersModalOpen(true);
      }
    },
    {
      title: "Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: "text-purple-600 bg-purple-50",
      onClick: () => setIsCustomersModalOpen(true)
    }
  ];

  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );

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
            {formatSafeDate(order.created_at)}
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

        {/* Site Lock Controls */}
        <div className="my-6 p-4 border rounded bg-muted/30 max-w-xl">
          <h2 className="text-lg font-semibold mb-2">Site Lock Controls</h2>
          {lockError && <div className="text-red-600 mb-2">{lockError}</div>}
          <div className="flex items-center gap-4 mb-2">
            <span className="font-medium">Status:</span>
            <span className={siteLock.status ? "text-red-600" : "text-green-600"}>
              {siteLock.status ? "Locked" : "Unlocked"}
            </span>
            <Button size="sm" variant={siteLock.status ? "default" : "destructive"} onClick={() => handleLockChange(!siteLock.status)} disabled={lockLoading}>
              {siteLock.status ? "Unlock Now" : "Lock Now"}
            </Button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="unlockAt" className="font-medium">Unlock At:</label>
            <input
              id="unlockAt"
              type="datetime-local"
              value={unlockInput}
              onChange={handleUnlockTimeChange}
              className="border rounded px-2 py-1"
              disabled={!siteLock.status || lockLoading}
            />
            <Button size="sm" onClick={handleSaveUnlockTime} disabled={!siteLock.status || lockLoading}>
              Save
            </Button>
          </div>
          {siteLock.unlock_at && (
            <div className="text-xs text-muted-foreground">Scheduled unlock: {formatSafeDate(siteLock.unlock_at)}</div>
          )}
        </div>

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
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full h-12">
            <TabsTrigger value="orders" className="data-[state=active]:shadow-md">Orders</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:shadow-md">Products</TabsTrigger>
            <TabsTrigger value="featured" className="data-[state=active]:shadow-md">Featured</TabsTrigger>
            <TabsTrigger value="new-arrivals" className="data-[state=active]:shadow-md">New Arrivals</TabsTrigger>
            <TabsTrigger value="special-offers" className="data-[state=active]:shadow-md">Special Offers</TabsTrigger>
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

          <TabsContent value="products" className="space-y-6">
            <OptimizedProductsSection />
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <FeaturedProductsManager />
          </TabsContent>

          <TabsContent value="new-arrivals" className="space-y-6">
            <NewArrivalsManager />
          </TabsContent>

          <TabsContent value="special-offers" className="space-y-6">
            <SpecialOffersManager />
          </TabsContent>
        </Tabs>
      </div>

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
                      <TableCell>{formatSafeDate(order.created_at)}</TableCell>
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

      <Dialog open={isPaymentsModalOpen} onOpenChange={setIsPaymentsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Total Revenue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border-b bg-muted/50 rounded-md">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Total completed payments</p>
              </div>
            </div>
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
                      <TableCell>{formatSafeDate(payment.created_at)}</TableCell>
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

      <Dialog open={isCustomersModalOpen} onOpenChange={setIsCustomersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Total Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border-b bg-muted/50 rounded-md">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">{stats.totalCustomers}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </div>
            </div>
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
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.full_name || 'N/A'}</TableCell>
                      <TableCell>{customer.email || 'N/A'}</TableCell>
                      <TableCell>{formatSafeDate(customer.created_at)}</TableCell>
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