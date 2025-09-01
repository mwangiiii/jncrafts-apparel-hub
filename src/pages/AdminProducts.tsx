import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductImage } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Eye, EyeOff, X, ChevronUp, ChevronDown, Package, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/AdminHeader';
import { useAdminProductsUltraFast, useRefreshAdminProductsUltraFast } from '@/hooks/useAdminProductsUltraFast';
import AdminProductCardSkeleton from '@/components/admin/AdminProductCardSkeleton';
import AdminProductImageManager from '@/components/admin/AdminProductImageManager';
import ProductMediaManager from '@/components/admin/ProductMediaManager';
import AdminProductsErrorBoundary from '@/components/admin/AdminProductsErrorBoundary';
import AdminProductsLoadingFallback from '@/components/admin/AdminProductsLoadingFallback';
import OptimizedAdminImage from '@/components/admin/OptimizedAdminImage';

const AdminProducts = () => {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // ULTRA-FAST MATERIALIZED VIEW QUERY - FORCE OPTIMIZED
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useAdminProductsUltraFast({ 
    enabled: !!user && isAdmin,
    pageSize: 8 // FORCE OPTIMIZED: Reduced batch size for ultra-fast loading
  });
  
  const { refreshProducts } = useRefreshAdminProductsUltraFast();
  
  // Flatten paginated data
  const products = data?.pages.flatMap(page => page.products) || [];

  // Form state - using simple types for form handling
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    images: [] as string[],
    videos: [] as string[],
    thumbnailIndex: 0,
    sizes: [] as string[],
    colors: [] as string[],
    stock_quantity: '',
    is_active: true
  });

  const [categories, setCategories] = useState<string[]>([]);
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '4XL', '5XL'];
  const availableColors = ['Black', 'White', 'Grey', 'Red', 'Jungle Green', 'Baby Pink', 'Beige'];

  useEffect(() => {
    if (user && isAdmin) {
      fetchCategories();
      // FORCE IMMEDIATE PRODUCT FETCH like homepage
      refetch();
    }
  }, [user, isAdmin, refetch]);

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const fetchCategories = async () => {
    try {
      console.log('🔒 ADMIN-ONLY CATEGORY FETCH - ROLE-BASED ISOLATION');
      // STRICT: Only category data for product management - NO USER DATA
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(50); // Efficiency limit for admin operations

      if (error) throw error;
      setCategories(data?.map(cat => cat.name) || []);
      console.log('✅ ADMIN CATEGORIES FETCHED:', data?.length || 0, 'categories (NO USER DATA)');
    } catch (error) {
      console.error('🚨 ADMIN CATEGORY FETCH FAILED:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <AdminProductsLoadingFallback />;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  // Error retry handler
  const handleRetry = () => {
    refetch();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      description: '',
      category: '',
      images: [],
      videos: [],
      thumbnailIndex: 0,
      sizes: [],
      colors: [],
      stock_quantity: '',
      is_active: true
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    
    // Convert mixed types to simple arrays for form handling
    const convertToStringArray = (arr: (string | any)[]): string[] => {
      return arr?.map(item => typeof item === 'string' ? item : (item.name || item)) || [];
    };
    
    const convertImagesToStrings = (images: (string | ProductImage)[]): string[] => {
      return images?.map(img => typeof img === 'string' ? img : img.image_url) || [];
    };
    
    setFormData({
      name: product.name,
      price: product.price.toString(),
      description: product.description || '',
      category: product.category,
      images: convertImagesToStrings(product.images || []),
      videos: product.videos || [],
      thumbnailIndex: product.thumbnail_index || 0,
      sizes: convertToStringArray(product.sizes || []),
      colors: convertToStringArray(product.colors || []),
      stock_quantity: product.stock_quantity.toString(),
      is_active: product.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category,
        images: formData.images,
        videos: formData.videos,
        thumbnail_index: formData.thumbnailIndex,
        sizes: formData.sizes,
        colors: formData.colors,
        stock_quantity: parseInt(formData.stock_quantity),
        is_active: formData.is_active
      };

      if (editingProduct) {
        console.log('🔒 ADMIN PRODUCT UPDATE - ROLE-BASED ISOLATION');
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
        console.log('✅ ADMIN PRODUCT UPDATED - NO USER DATA INVOLVED');
      } else {
        console.log('🔒 ADMIN PRODUCT CREATE - ROLE-BASED ISOLATION');
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        console.log('✅ ADMIN PRODUCT CREATED - NO USER DATA INVOLVED');
      }

      setIsDialogOpen(false);
      resetForm();
      refreshProducts();
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
      console.log('🔒 ADMIN PRODUCT STATUS TOGGLE - ROLE-BASED ISOLATION');
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      
      refreshProducts();
      toast({
        title: "Success",
        description: `Product ${product.is_active ? 'hidden' : 'activated'}`,
      });
      console.log('✅ ADMIN PRODUCT STATUS UPDATED - NO USER DATA INVOLVED');
    } catch (error) {
      console.error('🚨 ADMIN PRODUCT STATUS UPDATE FAILED:', error);
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
      console.log('🔒 ADMIN PRODUCT DELETE - ROLE-BASED ISOLATION');
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      refreshProducts();
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      console.log('✅ ADMIN PRODUCT DELETED - NO USER DATA INVOLVED');
    } catch (error) {
      console.error('🚨 ADMIN PRODUCT DELETE FAILED:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const addSize = (size: string) => {
    if (!formData.sizes.includes(size)) {
      setFormData(prev => ({ ...prev, sizes: [...prev.sizes, size] }));
    }
  };

  const removeSize = (size: string) => {
    setFormData(prev => ({ ...prev, sizes: prev.sizes.filter(s => s !== size) }));
  };

  const addColor = (color: string) => {
    if (!formData.colors.includes(color)) {
      setFormData(prev => ({ ...prev, colors: [...prev.colors, color] }));
    }
  };

  const removeColor = (color: string) => {
    setFormData(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ 
          ...prev, 
          images: [...prev.images, base64String] 
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ 
      ...prev, 
      images: prev.images.filter((_, i) => i !== index) 
    }));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...formData.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newImages.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  // Admin Product Card Component matching homepage styling
  const AdminProductCard = ({ product }: { product: any }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Intersection Observer for lazy loading (same as homepage)
    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }, []);

    // Helper function to get image URL (same as homepage)
    const getImageUrl = (image: string | ProductImage) => {
      return typeof image === 'string' ? image : image.image_url;
    };

    // Use thumbnail from database function - ultra-fast
    const thumbnailUrl = product.thumbnail_image || '/placeholder.svg';

    const getStockStatus = () => {
      if (product.stock_quantity === 0) {
        return { status: 'out', message: 'Out of Stock', variant: 'destructive' as const };
      } else if (product.stock_quantity <= 5) {
        return { status: 'low', message: `Only ${product.stock_quantity} left`, variant: 'secondary' as const };
      }
      return null;
    };

    const stockStatus = getStockStatus();

    return (
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
        {/* Image section matching homepage layout */}
        <div className="relative overflow-hidden">
          {/* Image section with optimized loading */}
          <OptimizedAdminImage
            src={product.thumbnail_image}
            alt={product.name}
            className="w-full h-80"
          />
          
          {/* Gradient overlay matching homepage */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Admin action buttons overlay (replacing homepage view/wishlist buttons) */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              className="p-2 bg-background/80 backdrop-blur-sm"
              onClick={() => openEditDialog(product)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="p-2 bg-background/80 backdrop-blur-sm"
              onClick={() => toggleProductStatus(product)}
            >
              {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="p-2 bg-background/80 backdrop-blur-sm"
              onClick={() => deleteProduct(product.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Status badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {!product.is_active && (
              <Badge variant="destructive" className="text-xs">
                Hidden
              </Badge>
            )}
            {product.new_arrival_date && (
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg text-xs">
                New
              </Badge>
            )}
          </div>

          {/* Stock status badge matching homepage */}
          {stockStatus && (
            <div className="absolute bottom-2 left-2">
              <Badge variant={stockStatus.variant} className="text-xs">
                {stockStatus.message}
              </Badge>
            </div>
          )}

          {/* Image count badge - optimized from database function */}
          {(product.total_images || 0) > 1 && (
            <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full px-2 py-1 text-xs font-medium shadow-lg">
              {product.total_images || 0} images
            </div>
          )}
        </div>
        
        {/* Card content matching homepage layout */}
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.category}</p>
              <p className="text-2xl font-bold text-primary mt-2">KSh {product.price.toLocaleString()}</p>
            </div>

            {/* Product details - optimized from database function */}
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Stock:</span> {product.stock_quantity}</p>
              <p><span className="font-medium">Colors:</span> {(product.colors_count || 0) > 0 ? `${product.colors_count} colors` : 'None'}</p>
              <p><span className="font-medium">Sizes:</span> {(product.sizes_count || 0) > 0 ? `${product.sizes_count} sizes` : 'None'}</p>
              <p><span className="font-medium">Images:</span> {product.total_images || 0}</p>
            </div>
            
            {/* Image Management - CRUD operations on normalized product_images table */}
            <div className="pt-2 border-t">
              <AdminProductImageManager 
                product={product} 
                onUpdate={() => refreshProducts()}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Product Management</h1>
              <p className="text-primary-foreground/80 text-lg">Add, edit, and manage your JNCRAFTS products</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
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
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
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
                          variant={formData.sizes.includes(size) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => formData.sizes.includes(size) ? removeSize(size) : addSize(size)}
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
                          variant={formData.colors.includes(color) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => formData.colors.includes(color) ? removeColor(color) : addColor(color)}
                        >
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>

                <ProductMediaManager
                  media={{
                    images: formData.images,
                    videos: formData.videos,
                    thumbnailIndex: formData.thumbnailIndex
                  }}
                  onMediaChange={(media) => setFormData(prev => ({
                    ...prev,
                    images: media.images,
                    videos: media.videos,
                    thumbnailIndex: media.thumbnailIndex
                  }))}
                />

                  <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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
        </div>

        {isError ? (
          <AdminProductsErrorBoundary 
            error={error}
            onRetry={handleRetry}
            isRetrying={isLoading}
          />
        ) : isLoading ? (
          <AdminProductsLoadingFallback />
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No products found</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first product to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <AdminProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={isFetchingNextPage}
                  size="lg"
                  variant="outline"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Products'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;