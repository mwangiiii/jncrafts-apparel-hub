import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Package, DollarSign, Users, TrendingUp, Eye, CheckCircle, Truck, X, Plus, Edit2, Trash2, EyeOff, ArrowUp, ArrowDown, Clock, AlertCircle, BarChart3, Target, ShoppingBag, Zap, Calendar, MapPin } from 'lucide-react';
import adminAnalytics from '@/assets/admin-analytics.jpg';
import orderFlow from '@/assets/order-flow.jpg';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  discount_code: string | null;
  customer_info: any;
  shipping_address: any;
  created_at: string;
  order_items: any[];
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  images: string[];
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0, totalCustomers: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('all');
  const { toast } = useToast();

  // Product form state
  const [productFormData, setProductFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    images: [] as string[],
    sizes: [] as string[],
    colors: [] as string[],
    stock_quantity: '',
    is_active: true
  });

  const categories = ['t-shirts', 'hoodies', 'jackets', 'pants', 'outerwear', 'accessories', 'footwear'];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const availableColors = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Brown', 'Olive'];

  // Chart data preparation
  const getOrderStatusData = () => {
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: statusCounts.pending || 0, color: '#f59e0b' },
      { name: 'Confirmed', value: statusCounts.confirmed || 0, color: '#3b82f6' },
      { name: 'Processing', value: statusCounts.processing || 0, color: '#f97316' },
      { name: 'Shipped', value: statusCounts.shipped || 0, color: '#8b5cf6' },
      { name: 'Delivered', value: statusCounts.delivered || 0, color: '#10b981' },
      { name: 'Cancelled', value: statusCounts.cancelled || 0, color: '#ef4444' }
    ];
  };

  const getCategoryData = () => {
    const categoryCounts = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts).map(([category, count]) => ({
      name: category,
      value: count,
      products: products.filter(p => p.category === category),
      totalStock: products.filter(p => p.category === category).reduce((sum, p) => sum + p.stock_quantity, 0)
    }));
  };

  const getRevenueByStatus = () => {
    const statusRevenue = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + Number(order.total_amount);
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: statusRevenue.pending || 0 },
      { name: 'Confirmed', value: statusRevenue.confirmed || 0 },
      { name: 'Processing', value: statusRevenue.processing || 0 },
      { name: 'Shipped', value: statusRevenue.shipped || 0 },
      { name: 'Delivered', value: statusRevenue.delivered || 0 }
    ];
  };

  const getQuickStats = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayOrders = orders.filter(order => new Date(order.created_at) >= todayStart);
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= weekAgo;
    });

    const lowStockProducts = products.filter(p => p.stock_quantity < 10 && p.is_active);
    
    return {
      todayOrders: todayOrders.length,
      weeklyOrders: recentOrders.length,
      lowStockCount: lowStockProducts.length,
      activeProducts: products.filter(p => p.is_active).length,
      urgentOrders: orders.filter(o => o.status === 'pending').length
    };
  };

  const quickStats = getQuickStats();

  useEffect(() => {
    if (user && isAdmin) {
      fetchOrders();
      fetchStats();
      fetchProducts();
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
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch orders"
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
        .select('total_amount, status');

      // Total customers
      const { data: customersData } = await supabase
        .from('profiles')
        .select('id');

      if (ordersData) {
        const totalOrders = ordersData.length;
        const totalRevenue = ordersData.reduce((sum, order) => sum + Number(order.total_amount), 0);
        const pendingOrders = ordersData.filter(order => order.status === 'pending').length;
        const totalCustomers = customersData?.length || 0;

        setStats({ totalOrders, totalRevenue, pendingOrders, totalCustomers });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Find the order to get customer details for email
      const order = orders.find(o => o.id === orderId);
      if (order) {
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
      }

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}. Customer has been notified via email.`
      });

      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order status"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500 hover:bg-amber-600';
      case 'confirmed': return 'bg-blue-500 hover:bg-blue-600';
      case 'processing': return 'bg-orange-500 hover:bg-orange-600';
      case 'shipped': return 'bg-purple-500 hover:bg-purple-600';
      case 'delivered': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'cancelled': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusActions = (order: Order) => {
    const actions = [];
    
    if (order.status === 'pending') {
      actions.push(
        <Button key="confirm" size="sm" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirm
        </Button>
      );
    }
    
    if (order.status === 'confirmed') {
      actions.push(
        <Button key="process" size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'processing')}>
          <Package className="h-3 w-3 mr-1" />
          Process
        </Button>
      );
    }
    
    if (order.status === 'processing') {
      actions.push(
        <Button key="ship" size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'shipped')}>
          <Truck className="h-3 w-3 mr-1" />
          Ship
        </Button>
      );
    }
    
    if (order.status === 'shipped') {
      actions.push(
        <Button key="deliver" size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, 'delivered')}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Delivered
        </Button>
      );
    }
    
    if (['pending', 'confirmed'].includes(order.status)) {
      actions.push(
        <Button key="cancel" size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
      );
    }
    
    return actions;
  };

  // Product management functions
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const resetProductForm = () => {
    setProductFormData({
      name: '',
      price: '',
      description: '',
      category: '',
      images: [],
      sizes: [],
      colors: [],
      stock_quantity: '',
      is_active: true
    });
    setEditingProduct(null);
    setNewImageUrl('');
  };

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      price: product.price.toString(),
      description: product.description || '',
      category: product.category,
      images: product.images,
      sizes: product.sizes,
      colors: product.colors,
      stock_quantity: product.stock_quantity.toString(),
      is_active: product.is_active
    });
    setIsProductDialogOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: productFormData.name,
        price: parseFloat(productFormData.price),
        description: productFormData.description,
        category: productFormData.category,
        images: productFormData.images,
        sizes: productFormData.sizes,
        colors: productFormData.colors,
        stock_quantity: parseInt(productFormData.stock_quantity),
        is_active: productFormData.is_active
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      setIsProductDialogOpen(false);
      resetProductForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      
      fetchProducts();
      toast({
        title: "Success",
        description: `Product ${product.is_active ? 'hidden' : 'activated'}`,
      });
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive"
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      fetchProducts();
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const addSize = (size: string) => {
    if (!productFormData.sizes.includes(size)) {
      setProductFormData(prev => ({ ...prev, sizes: [...prev.sizes, size] }));
    }
  };

  const removeSize = (size: string) => {
    setProductFormData(prev => ({ ...prev, sizes: prev.sizes.filter(s => s !== size) }));
  };

  const addColor = (color: string) => {
    if (!productFormData.colors.includes(color)) {
      setProductFormData(prev => ({ ...prev, colors: [...prev.colors, color] }));
    }
  };

  const removeColor = (color: string) => {
    setProductFormData(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }));
  };

  // Image management functions
  const addImageUrl = () => {
    if (newImageUrl.trim() && !productFormData.images.includes(newImageUrl.trim())) {
      setProductFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, newImageUrl.trim()] 
      }));
      setNewImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setProductFormData(prev => ({ 
      ...prev, 
      images: prev.images.filter((_, i) => i !== index) 
    }));
  };

  const moveImageUp = (index: number) => {
    if (index > 0) {
      const newImages = [...productFormData.images];
      [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
      setProductFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  const moveImageDown = (index: number) => {
    if (index < productFormData.images.length - 1) {
      const newImages = [...productFormData.images];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      setProductFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  // Filter functions
  const filteredOrders = selectedOrderStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedOrderStatus);

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Enhanced Header with Hero Image */}
        <header className="mb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-admin-secondary text-white shadow-2xl">
            <div className="absolute inset-0 opacity-10">
              <img src={adminAnalytics} alt="Analytics Background" className="w-full h-full object-cover" />
            </div>
            
            <div className="relative p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
                      <p className="text-lg text-white/90 mt-1">Complete business insights and management</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-white/80">Last updated</p>
                    <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Stats Cards with Quick Actions */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Total Orders */}
            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{stats.totalOrders}</div>
                    <div className="text-sm text-muted-foreground font-medium">All Orders</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">+{quickStats.todayOrders} today</div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">KSh {stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground font-medium">Revenue</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Total earnings</div>
              </div>
            </div>

            {/* Urgent Orders */}
            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{quickStats.urgentOrders}</div>
                    <div className="text-sm text-muted-foreground font-medium">Urgent</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Needs attention</div>
              </div>
            </div>

            {/* Active Products */}
            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{quickStats.activeProducts}</div>
                    <div className="text-sm text-muted-foreground font-medium">Products</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Active items</div>
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg group-hover:shadow-red-500/25 transition-all duration-300">
                    <Target className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{quickStats.lowStockCount}</div>
                    <div className="text-sm text-muted-foreground font-medium">Low Stock</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Restock soon</div>
              </div>
            </div>
          </div>
        </section>

        {/* Analytics Charts */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Status Chart */}
            <Card className="admin-card border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                  Order Status Distribution
                </CardTitle>
                <CardDescription>Visual breakdown of order statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getOrderStatusData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                      >
                        {getOrderStatusData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Status */}
            <Card className="admin-card border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                  Revenue by Order Status
                </CardTitle>
                <CardDescription>Revenue breakdown across order stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getRevenueByStatus()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Management Tabs with Enhanced Layout */}
        <section className="space-y-8">
          <Tabs defaultValue="orders" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Business Management</h2>
                <p className="text-muted-foreground">Comprehensive order and product management</p>
              </div>
              <TabsList className="grid w-full sm:w-auto grid-cols-3 h-12 p-1 bg-muted/80 backdrop-blur-sm rounded-xl shadow-sm">
                <TabsTrigger 
                  value="orders" 
                  className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200 rounded-lg"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="products" 
                  className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200 rounded-lg"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Products
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-foreground transition-all duration-200 rounded-lg"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Orders Tab with Status Filtering */}
            <TabsContent value="orders" className="space-y-6 animate-fade-in-up">
              <Card className="admin-card border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50 pb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-foreground">Order Management</CardTitle>
                        <CardDescription className="text-base text-muted-foreground mt-1">
                          Track and manage orders by status
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select value={selectedOrderStatus} onValueChange={setSelectedOrderStatus}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Orders</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {loadingData ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground text-lg">Loading orders...</p>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <img src={orderFlow} alt="No Orders" className="w-32 h-32 mx-auto mb-6 rounded-lg opacity-60" />
                      <p className="text-muted-foreground text-lg">No orders found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedOrderStatus === 'all' 
                          ? 'Orders will appear here when customers place them'
                          : `No ${selectedOrderStatus} orders at the moment`
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Order Status Categories */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        {getOrderStatusData().map((status) => (
                          <div key={status.name} className="text-center p-4 bg-gradient-to-br from-white to-muted/30 rounded-xl border shadow-sm">
                            <div 
                              className="w-4 h-4 rounded-full mx-auto mb-2" 
                              style={{ backgroundColor: status.color }}
                            ></div>
                            <div className="text-2xl font-bold text-foreground">{status.value}</div>
                            <div className="text-xs text-muted-foreground">{status.name}</div>
                          </div>
                        ))}
                      </div>

                      {/* Orders List */}
                      {filteredOrders.map((order) => (
                        <Card key={order.id} className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-muted/10">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                              <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-bold text-xl text-primary">#{order.order_number}</h3>
                                  <Badge className={`${getStatusColor(order.status)} text-white text-sm px-3 py-1 font-medium`}>
                                    {order.status.toUpperCase()}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium text-foreground">{order.customer_info?.fullName || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">📧 {order.customer_info?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">{order.shipping_address?.city || 'N/A'}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-emerald-600" />
                                      <span className="font-bold text-emerald-700 text-lg">KSh {order.total_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">{order.order_items?.length || 0} items</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-3">
                                {getStatusActions(order).map((action, index) => (
                                  <div key={index} className="transform transition-all duration-200 hover:scale-105">
                                    {action}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab with Category Filtering */}
            <TabsContent value="products" className="space-y-6 animate-fade-in-up">
              <Card className="admin-card border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50 pb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-foreground">Product Management</CardTitle>
                        <CardDescription className="text-base text-muted-foreground mt-1">Manage products by category</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                        <DialogTrigger asChild>
                          <Button onClick={resetProductForm} className="btn-primary">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <form onSubmit={handleProductSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="name">Product Name</Label>
                                <Input
                                  id="name"
                                  value={productFormData.name}
                                  onChange={(e) => setProductFormData(prev => ({ ...prev, name: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="price">Price</Label>
                                <Input
                                  id="price"
                                  type="number"
                                  step="0.01"
                                  value={productFormData.price}
                                  onChange={(e) => setProductFormData(prev => ({ ...prev, price: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={productFormData.description}
                                onChange={(e) => setProductFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                              />
                            </div>

                            {/* Product Images */}
                            <div>
                              <Label>Product Images</Label>
                              <div className="space-y-4">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Enter image URL"
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                  />
                                  <Button 
                                    type="button" 
                                    onClick={addImageUrl}
                                    variant="outline"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                {productFormData.images.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Current Images:</p>
                                    {productFormData.images.map((image, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                                        <img 
                                          src={image} 
                                          alt={`Product ${index + 1}`} 
                                          className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1 truncate">
                                          <p className="text-sm">{image}</p>
                                          <p className="text-xs text-muted-foreground">Position {index + 1}</p>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => moveImageUp(index)}
                                            disabled={index === 0}
                                          >
                                            <ArrowUp className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => moveImageDown(index)}
                                            disabled={index === productFormData.images.length - 1}
                                          >
                                            <ArrowDown className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => removeImage(index)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="category">Category</Label>
                                <Select value={productFormData.category} onValueChange={(value) => setProductFormData(prev => ({ ...prev, category: value }))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map(cat => (
                                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="stock">Stock Quantity</Label>
                                <Input
                                  id="stock"
                                  type="number"
                                  value={productFormData.stock_quantity}
                                  onChange={(e) => setProductFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>

                            {/* Sizes */}
                            <div>
                              <Label>Available Sizes</Label>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {availableSizes.map(size => (
                                  <Badge
                                    key={size}
                                    variant={productFormData.sizes.includes(size) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => productFormData.sizes.includes(size) ? removeSize(size) : addSize(size)}
                                  >
                                    {size}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Colors */}
                            <div>
                              <Label>Available Colors</Label>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {availableColors.map(color => (
                                  <Badge
                                    key={color}
                                    variant={productFormData.colors.includes(color) ? "default" : "outline"}
                                    className="cursor-pointer"
                                    onClick={() => productFormData.colors.includes(color) ? removeColor(color) : addColor(color)}
                                  >
                                    {color}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-4">
                              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" className="btn-primary">
                                {editingProduct ? 'Update Product' : 'Create Product'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {loadingProducts ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground text-lg">Loading products...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">No products found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedCategory === 'all' 
                          ? 'Create your first product to get started'
                          : `No products in ${selectedCategory} category`
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Category Overview */}
                      <div className="mb-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                          {getCategoryData().map((category) => (
                            <div key={category.name} className="text-center p-4 bg-gradient-to-br from-white to-muted/30 rounded-xl border shadow-sm">
                              <div className="text-2xl font-bold text-primary">{category.value}</div>
                              <div className="text-xs text-muted-foreground capitalize">{category.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">Stock: {category.totalStock}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Products Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map(product => (
                          <Card key={product.id} className={`${!product.is_active ? 'opacity-60' : ''} admin-card border-0 overflow-hidden`}>
                            <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted/80 relative">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                              {product.stock_quantity < 10 && (
                                <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-lg">{product.name}</h3>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleProductStatus(product)}
                                      className="h-8 w-8 p-0"
                                    >
                                      {product.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEditProductDialog(product)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteProduct(product.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-2xl font-bold text-primary">KSh {product.price.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                                  <Badge variant="outline">Stock: {product.stock_quantity}</Badge>
                                  {!product.is_active && <Badge variant="destructive">Hidden</Badge>}
                                </div>
                                <div className="space-y-1 text-xs">
                                  <p><span className="font-medium">Sizes:</span> {product.sizes.join(', ')}</p>
                                  <p><span className="font-medium">Colors:</span> {product.colors.join(', ')}</p>
                                  <p><span className="font-medium">Images:</span> {product.images?.length || 0}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6 animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Categories Distribution */}
                <Card className="admin-card border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Target className="h-6 w-6 text-primary" />
                      Product Categories
                    </CardTitle>
                    <CardDescription>Distribution of products across categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getCategoryData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <ChartTooltip />
                          <Bar dataKey="value" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Insights */}
                <Card className="admin-card border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Zap className="h-6 w-6 text-amber-500" />
                      Business Insights
                    </CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Average Order Value</span>
                        <span className="text-lg font-bold text-primary">
                          KSh {stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString() : 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Weekly Orders</span>
                        <span className="text-lg font-bold text-emerald-600">{quickStats.weeklyOrders}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Conversion Rate</span>
                        <span className="text-lg font-bold text-blue-600">
                          {stats.totalCustomers > 0 ? Math.round((stats.totalOrders / stats.totalCustomers) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Active Products</span>
                        <span className="text-lg font-bold text-purple-600">{quickStats.activeProducts}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <span className="text-sm font-medium text-red-700">Low Stock Alerts</span>
                        <span className="text-lg font-bold text-red-600">{quickStats.lowStockCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;