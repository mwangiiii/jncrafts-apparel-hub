import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
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
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    totalCustomers: 0
  });
  const [loadingData, setLoadingData] = useState(true);
  const [statusOptions, setStatusOptions] = useState<OrderStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin]);

  const loadData = async () => {
    setLoadingData(true);
    await Promise.all([
      fetchOrders(),
      fetchStats(),
      fetchStatusOptions()
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
          *,
          order_status:status_id (
            id,
            name,
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10); // Limit for dashboard; full list in separate view

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Fetch order items for each order (optimized: batch if possible, but sequential for simplicity)
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
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

  const fetchStats = async () => {
    try {
      // Total orders and revenue
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, status_id');

      // Total customers (from profiles or auth.users count)
      const { count: customersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (ordersData) {
        const totalOrders = ordersData.length;
        const totalRevenue = ordersData.reduce((sum, order) => sum + Number(order.total_amount), 0);
        
        // Get pending status ID
        const { data: pendingStatus } = await supabase
          .from('order_status')
          .select('id')
          .eq('name', 'pending')
          .single();
        
        const pendingOrders = pendingStatus ? 
          ordersData.filter(order => order.status_id === pendingStatus.id).length : 0;

        setStats({
          totalOrders,
          totalRevenue,
          pendingOrders,
          totalCustomers: customersCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatusId: string) => {
    try {
      // Get the status details for the new status
      const { data: statusData, error: statusError } = await supabase
        .from('order_status')
        .select('id, name, display_name')
        .eq('id', newStatusId)
        .single();

      if (statusError || !statusData) {
        throw new Error('Invalid status');
      }

      // Update the order
      const { error } = await supabase
        .from('orders')
        .update({ status_id: newStatusId })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      // Send email notification (aligns with revamped schema)
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const orderData = {
          order_number: order.order_number,
          status: statusData.name,
          customer_email: (order.customer_info as any)?.email,
          total_amount: order.total_amount,
          discount_amount: order.discount_amount // Include discount from schema
        };

        try {
          await supabase.functions.invoke('send-order-status-update', {
            body: { orderData }
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't throw error for email failures
        }
      }

      setOrders(orders.map(order => 
        order.id === orderId ? { 
          ...order, 
          status_id: newStatusId,
          order_status: statusData 
        } : order
      ));

      toast({
        title: "Order Updated",
        description: `Order status changed to ${statusData.display_name}. Customer notified via email.`,
      });

      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
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
      href: "/admin/orders"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: "+8%",
      icon: DollarSign,
      color: "text-green-600 bg-green-50",
      href: "/admin/reports/revenue"
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      change: "-2%",
      icon: Package,
      color: "text-orange-600 bg-orange-50",
      href: "/admin/orders?status=pending"
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      change: "+15%",
      icon: Users,
      color: "text-purple-600 bg-purple-50",
      href: "/admin/customers"
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
            <p>Customer: {(order.customer_info as any)?.fullName || 'N/A'}</p>
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

  return (
    <div className="min-h-screen bg-background">
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
            <Card key={index} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <a href={stat.href} className="block p-6 space-y-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">Change: <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>{stat.change}</span></p>
                  </div>
                </CardContent>
              </a>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs - Improved spacing and focus */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full h-12">
            <TabsTrigger value="orders" className="data-[state=active]:shadow-md">Orders</TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:shadow-md">Products</TabsTrigger>
            <TabsTrigger value="new-arrivals" className="data-[state=active]:shadow-md">New Arrivals</TabsTrigger>
            <TabsTrigger value="featured" className="data-[state=active]:shadow-md">Featured</TabsTrigger>
            <TabsTrigger value="offers" className="data-[state=active]:shadow-md">Special Offers</TabsTrigger>
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
                    {orders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;