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
import { ShoppingCart, Users, DollarSign, Package, Eye } from 'lucide-react';
import { format } from "date-fns";
import { OptimizedProductsSection } from '@/components/admin/OptimizedProductsSection';
import NewArrivalsManager from '@/components/admin/NewArrivalsManager';
import SpecialOffersManager from '@/components/admin/SpecialOffersManager';
import FeaturedProductsManager from '@/components/admin/FeaturedProductsManager';
import type { Json } from '@/integrations/supabase/types';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status_id: string;
  created_at: string;
  customer_info: Json;
  discount_amount: number;
  order_items: any[];
  order_status?: {
    id: string;
    name: string;
    display_name: string;
  };
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

interface OrderStatus {
  id: string;
  name: string;
  display_name: string;
}

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

  useEffect(() => {
    if (user && isAdmin) {
      fetchOrders();
      fetchStats();
      fetchStatusOptions();
    }
  }, [user, isAdmin]);

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
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return { ...order, order_items: [] };
          }

          return { ...order, order_items: itemsData || [] };
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
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total orders and revenue
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, status_id');

      // Total customers
      const { data: customersData } = await supabase
        .from('profiles')
        .select('id');

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
          totalCustomers: customersData?.length || 0
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

      // Send email notification
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const orderData = {
          order_number: order.order_number,
          status: statusData.name,
          customer_email: (order.customer_info as any)?.email,
          total_amount: order.total_amount
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
        description: `Order status changed to ${statusData.display_name}. Customer has been notified via email.`
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Stats cards
  const statsCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders.toString(),
      icon: Package,
      color: "text-orange-600"
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: "text-purple-600"
    }
  ];

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your store, orders, and products</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="new-arrivals">New Arrivals</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="offers">Special Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Recent Orders
                </CardTitle>
                <CardDescription>
                  Manage and track customer orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {orders.slice(0, 8).map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">#{order.order_number}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(`/admin/orders/${order.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            <p className="font-semibold">{formatCurrency(Number(order.total_amount))}</p>
                            
                            <div className="flex items-center justify-between">
                              <Badge variant={
                                order.order_status?.name === 'delivered' ? 'default' :
                                order.order_status?.name === 'shipped' ? 'secondary' :
                                order.order_status?.name === 'processing' ? 'outline' :
                                'destructive'
                              }>
                                {order.order_status?.display_name || 'Unknown'}
                              </Badge>
                              
                              <Select 
                                value={order.status_id} 
                                onValueChange={(newStatusId) => updateOrderStatus(order.id, newStatusId)}
                              >
                                <SelectTrigger className="w-32 h-7 text-xs">
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
                            
                            <p className="text-xs text-muted-foreground">
                              Customer: {(order.customer_info as any)?.fullName || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Items: {order.order_items?.length || 0}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {orders.length > 8 && (
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          onClick={() => window.open('/admin/orders', '_blank')}
                        >
                          View All Orders
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <OptimizedProductsSection onOpenProductDialog={() => {}} onEditProduct={() => {}} />
          </TabsContent>

          <TabsContent value="new-arrivals">
            <NewArrivalsManager />
          </TabsContent>

          <TabsContent value="featured">
            <FeaturedProductsManager />
          </TabsContent>

          <TabsContent value="offers">
            <SpecialOffersManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;