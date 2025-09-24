import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Eye, EyeOff, Package, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/AdminHeader';
import { useAdminProducts, useRefreshAdminProducts } from '@/hooks/useAdminProducts';
import { useCompleteProductManagement } from '@/hooks/useCompleteProductManagement';
import AdminProductCardSkeleton from '@/components/admin/AdminProductCardSkeleton';
import AdminProductImageManager from '@/components/admin/AdminProductImageManager';
import AdminProductsErrorBoundary from '@/components/admin/AdminProductsErrorBoundary';
import AdminProductsLoadingFallback from '@/components/admin/AdminProductsLoadingFallback';
import OptimizedAdminImage from '@/components/admin/OptimizedAdminImage';

interface Category {
  id: string;
  name: string;
}

const AdminProducts = () => {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useAdminProducts({ enabled: !!user && isAdmin });
  const { refreshProducts } = useRefreshAdminProducts();
  const { createCompleteProduct, updateCompleteProduct, isCreating, isUpdating } = useCompleteProductManagement();

  const products = data?.pages.flatMap(page => page.products) || [];
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '', // This will store category UUID, not name
    images: [] as string[],
    videos: [] as string[],
    thumbnailIndex: 0,
    sizes: [] as string[],
    colors: [] as string[],
    stock_quantity: '',
    is_active: true,
  });

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
  const availableColors = ['Black', 'White', 'Grey', 'Red', 'Jungle Green', 'Baby Pink', 'Beige'];

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
      if (data.length === 0) {
        toast({
          title: "No Categories Found",
          description: "Please add categories in the categories management section first.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Category fetch error:', error);
      toast({
        title: "Category Fetch Error",
        description: error.message || "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchCategories();
      refetch();
    }
  }, [user, isAdmin, refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      is_active: true,
    });
    setEditingProduct(null);
  };

  const openEditDialog = async (product: any) => {
    try {
      setEditingProduct(product);
      
      // Get category UUID from category name
      const category = categories.find(cat => cat.name === product.category_name);
      const categoryId = category?.id || '';

      // Load existing variants for this product
      const { data: variants } = await supabase
        .from('product_variants')
        .select(`
          stock_quantity,
          colors!inner(name),
          sizes!inner(name)
        `)
        .eq('product_id', product.id);

      const existingSizes = [...new Set(variants?.filter(v => v.sizes?.name).map(v => v.sizes.name) || [])];
      const existingColors = [...new Set(variants?.filter(v => v.colors?.name).map(v => v.colors.name) || [])];
      const totalStock = variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0;

      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description || '',
        category: categoryId, // Store UUID, not name
        images: [], // Images managed separately via AdminProductImageManager
        videos: [],
        thumbnailIndex: product.thumbnail_index || 0,
        sizes: existingSizes,
        colors: existingColors,
        stock_quantity: totalStock.toString(),
        is_active: product.is_active,
      });
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error('Error loading product for edit:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    if (formData.sizes.length === 0 && formData.colors.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one size or color",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category, // This is now a UUID
        images: formData.images,
        videos: formData.videos,
        thumbnailIndex: formData.thumbnailIndex,
        sizes: formData.sizes,
        colors: formData.colors,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        is_active: formData.is_active,
      };

      console.log('Submitting product data:', {
        ...productData,
        categoryName: categories.find(c => c.id === productData.category)?.name
      });

      if (editingProduct) {
        console.log('🔒 Updating product:', productData.name);
        await updateCompleteProduct.mutateAsync({ productId: editingProduct.id, productData });
        console.log('✅ Product updated');
      } else {
        console.log('🔒 Creating product:', productData.name);
        await createCompleteProduct.mutateAsync({ productData });
        console.log('✅ Product created');
      }

      setIsDialogOpen(false);
      resetForm();
      refreshProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      // Don't show error toast here as it's handled by the mutation
    }
  };

  const toggleProductStatus = async (product: any) => {
    try {
      console.log('🔒 Toggling product status:', product.name);
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
      console.log('✅ Product status updated');
    } catch (error: any) {
      console.error('Error toggling product status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product status",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      console.log('🔒 Deleting product:', productId);
      
      // Get images to delete from storage
      const { data: images } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', productId);
      
      // Delete images from storage
      if (images && images.length > 0) {
        const fileNames = images
          .map(img => img.image_url.split('/').pop())
          .filter(name => name && !name.includes('default.jpg'));
        
        if (fileNames.length > 0) {
          await supabase.storage
            .from('images')
            .remove(fileNames.map(name => `thumbnails/${name}`));
        }
      }

      // Delete related records (cascade should handle this, but being explicit)
      await supabase.from('product_variants').delete().eq('product_id', productId);
      await supabase.from('product_images').delete().eq('product_id', productId);
      
      // Delete the product
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      
      refreshProducts();
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      console.log('✅ Product deleted');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const newImages: string[] = [];

    try {
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is over 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(`thumbnails/${fileName}`, file, { 
            contentType: file.type,
            upsert: false 
          });
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const imageUrl = `https://ppljsayhwtlogficifar.supabase.co/storage/v1/object/public/images/thumbnails/${fileName}`;
        newImages.push(imageUrl);
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
      toast({
        title: "Images added",
        description: `Added ${newImages.length} image(s) to form`,
      });
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: "Image upload failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...formData.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newImages.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  if (loading) return <AdminProductsLoadingFallback />;
  if (!user || !isAdmin) return <Navigate to="/auth" replace />;

  const AdminProductCard = ({ product }: { product: any }) => {
    return (
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
        <div className="relative overflow-hidden">
          <OptimizedAdminImage
            src={product.thumbnail_image}
            alt={product.name}
            className="w-full h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {!product.is_active && (
              <Badge variant="destructive" className="text-xs">Hidden</Badge>
            )}
            {product.new_arrival_date && (
              <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg text-xs">New</Badge>
            )}
          </div>
          {product.stock_quantity <= 5 && (
            <div className="absolute bottom-2 left-2">
              <Badge variant={product.stock_quantity === 0 ? "destructive" : "secondary"} className="text-xs">
                {product.stock_quantity === 0 ? 'Out of Stock' : `Only ${product.stock_quantity} left`}
              </Badge>
            </div>
          )}
          {product.total_images > 1 && (
            <div className="absolute bottom-2 right-2 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full px-2 py-1 text-xs font-medium shadow-lg">
              {product.total_images} images
            </div>
          )}
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.category_name}</p>
              <p className="text-2xl font-bold text-primary mt-2">KSh {product.price.toLocaleString()}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Stock:</span> {product.stock_quantity}</p>
              <p><span className="font-medium">Colors:</span> {product.colors_count > 0 ? `${product.colors_count} colors` : 'None'}</p>
              <p><span className="font-medium">Sizes:</span> {product.sizes_count > 0 ? `${product.sizes_count} sizes` : 'None'}</p>
              <p><span className="font-medium">Images:</span> {product.total_images}</p>
            </div>
            <div className="pt-2 border-t">
              <AdminProductImageManager product={product} onUpdate={() => refreshProducts()} />
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
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
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
                          <SelectValue placeholder={categories.length > 0 ? "Select category" : "Loading categories..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {categories.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Add categories in Admin → Categories first</p>
                      )}
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
                    {formData.sizes.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {formData.sizes.join(', ')}
                      </p>
                    )}
                  </div>
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
                    {formData.colors.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {formData.colors.join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Images</Label>
                    <Input type="file" accept="image/*" multiple onChange={handleImageUpload} />
                    {formData.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.images.map((image, index) => (
                          <div key={index} className="relative">
                            <img src={image} alt={`Preview ${index}`} className="w-20 h-20 object-cover rounded" />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-0 right-0 h-5 w-5 p-0"
                              onClick={() => removeImage(index)}
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute top-0 left-0 h-5 w-5 p-0"
                              onClick={() => moveImage(index, 'up')}
                              disabled={index === 0}
                              type="button"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute bottom-0 left-0 h-5 w-5 p-0"
                              onClick={() => moveImage(index, 'down')}
                              disabled={index === formData.images.length - 1}
                              type="button"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isCreating || isUpdating}>
                      {(isCreating || isUpdating) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingProduct ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingProduct ? 'Update Product' : 'Create Product'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {error ? (
          <AdminProductsErrorBoundary error={error} onRetry={refetch} isRetrying={isLoading} />
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
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button onClick={handleLoadMore} disabled={isFetchingNextPage} size="lg" variant="outline">
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