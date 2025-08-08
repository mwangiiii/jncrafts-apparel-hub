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
import { Package, DollarSign, Users, TrendingUp, Eye, CheckCircle, Truck, X, Plus, Edit2, Trash2, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';

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
              shippingAddress: order.shipping_address
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
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'processing': return 'bg-orange-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your jnCrafts business</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Order Management</TabsTrigger>
            <TabsTrigger value="products">Product Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>View and manage all customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No orders found</div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="border">
                        <CardContent className="pt-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold">{order.order_number}</span>
                                <Badge className={`${getStatusColor(order.status)} text-white`}>
                                  {order.status.toUpperCase()}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-muted-foreground">
                                <p><strong>Customer:</strong> {order.customer_info?.fullName}</p>
                                <p><strong>Email:</strong> {order.customer_info?.email}</p>
                                <p><strong>Total:</strong> ${order.total_amount}</p>
                                {order.discount_code && (
                                  <p><strong>Discount:</strong> {order.discount_code} (-${order.discount_amount})</p>
                                )}
                                <p><strong>Items:</strong> {order.order_items?.length || 0} item(s)</p>
                                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {getStatusActions(order)}
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

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Management</CardTitle>
                    <CardDescription>Add, edit, and manage products in your store</CardDescription>
                  </div>
                  <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetProductForm}>
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
                            {/* Add new image URL */}
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
                            
                            {/* Current images with reorder functionality */}
                            {productFormData.images.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Current Images (drag to reorder):</p>
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
                          <Button type="submit">
                            {editingProduct ? 'Update Product' : 'Create Product'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="text-center py-8">Loading products...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                      <Card key={product.id} className={`${!product.is_active ? 'opacity-60' : ''}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleProductStatus(product)}
                              >
                                {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditProductDialog(product)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-2xl font-bold text-primary">${product.price}</p>
                            <p className="text-sm text-muted-foreground">{product.description}</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary">{product.category}</Badge>
                              <Badge variant="outline">Stock: {product.stock_quantity}</Badge>
                              {!product.is_active && <Badge variant="destructive">Hidden</Badge>}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium">Sizes: {product.sizes.join(', ')}</p>
                              <p className="text-xs font-medium">Colors: {product.colors.join(', ')}</p>
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
      </div>
    </div>
  );
};

export default AdminDashboard;