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
import { Package, DollarSign, Users, TrendingUp, Eye, CheckCircle, Truck, X, Plus, Edit2, Trash2, EyeOff, ArrowUp, ArrowDown, Clock } from 'lucide-react';

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

  const categories = ['t-shirts', 'hoodies', 'jackets', 'pants', 'outerwear'];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const availableColors = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Brown', 'Olive'];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Modern Header */}
        <header className="mb-10">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-admin-secondary text-white shadow-2xl">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
            </div>
            
            <div className="relative p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
                      <p className="text-lg text-white/90 mt-1">Welcome back! Here&apos;s what&apos;s happening with your business today.</p>
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

        {/* Stats Cards */}
        <section className="mb-12" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">Business Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{stats.totalOrders}</div>
                    <div className="text-sm text-muted-foreground font-medium">Total Orders</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-muted-foreground">All time orders</span>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">KSh {stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground font-medium">Total Revenue</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span className="text-muted-foreground">Total earnings</span>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{stats.pendingOrders}</div>
                    <div className="text-sm text-muted-foreground font-medium">Pending Orders</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <span className="text-muted-foreground">Requires attention</span>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="admin-card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">{stats.totalCustomers}</div>
                    <div className="text-sm text-muted-foreground font-medium">Total Customers</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <span className="text-muted-foreground">Registered users</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Management Tabs */}
        <section className="space-y-8">
          <Tabs defaultValue="orders" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Business Management</h2>
                <p className="text-muted-foreground">Manage orders and products efficiently</p>
              </div>
              <TabsList className="grid w-full sm:w-auto grid-cols-2 h-12 p-1 bg-muted/80 backdrop-blur-sm rounded-xl shadow-sm">
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
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Products
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="orders" className="space-y-6 animate-fade-in-up">
              <Card className="admin-card border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-foreground">Order Management</CardTitle>
                      <CardDescription className="text-base text-muted-foreground mt-1">
                        Track and manage customer orders with real-time status updates
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {loadingData ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground text-lg">Loading orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">No orders found</p>
                      <p className="text-sm text-muted-foreground mt-2">Orders will appear here when customers place them</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => (
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
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-emerald-600" />
                                      <span className="font-bold text-emerald-700 text-lg">KSh {order.total_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">📅 {new Date(order.created_at).toLocaleDateString()}</span>
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

            <TabsContent value="products" className="space-y-6 animate-fade-in-up">
              <Card className="admin-card border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold text-foreground">Product Management</CardTitle>
                        <CardDescription className="text-base text-muted-foreground mt-1">Add, edit, and manage products in your store</CardDescription>
                      </div>
                    </div>
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
                </CardHeader>
                <CardContent className="p-8">
                  {loadingProducts ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground text-lg">Loading products...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">No products found</p>
                      <p className="text-sm text-muted-foreground mt-2">Create your first product to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map(product => (
                        <Card key={product.id} className={`${!product.is_active ? 'opacity-60' : ''} admin-card border-0`}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg font-bold">{product.name}</CardTitle>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleProductStatus(product)}
                                  className="hover:scale-105 transition-transform"
                                >
                                  {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditProductDialog(product)}
                                  className="hover:scale-105 transition-transform"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteProduct(product.id)}
                                  className="hover:scale-105 transition-transform"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <p className="text-2xl font-bold text-primary">KSh {product.price.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary">{product.category}</Badge>
                                <Badge variant="outline">Stock: {product.stock_quantity}</Badge>
                                {!product.is_active && <Badge variant="destructive">Hidden</Badge>}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium">Sizes: {product.sizes.join(', ')}</p>
                                <p className="text-xs font-medium">Colors: {product.colors.join(', ')}</p>
                                <p className="text-xs font-medium">Images: {product.images?.length || 0}</p>
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
          </Tabs>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;