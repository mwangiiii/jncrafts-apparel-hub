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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
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
import debounce from 'lodash/debounce';

interface Category {
  id: string;
  name: string;
}

interface Variant {
  color: string | null;
  size: string | null;
  stock_quantity: number;
  additional_price: number;
}

const AdminProducts = () => {
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useAdminProducts({ enabled: !!user && isAdmin });
  const { refreshProducts } = useRefreshAdminProducts();
  const { createCompleteProduct, updateCompleteProduct, isCreating, isUpdating } = useCompleteProductManagement();

  const products = data?.pages.flatMap(page => page.products) || [];
  const [categories, setCategories] = useState<Category[]>([]);
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
    variants: [] as Variant[],
    totalStock: 0,
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

  useEffect(() => {
    const colorSet = new Set(formData.colors);
    const sizeSet = new Set(formData.sizes);
    const newVariants: Variant[] = [];

    if (colorSet.size > 0 && sizeSet.size > 0) {
      formData.colors.forEach(color => {
        formData.sizes.forEach(size => {
          const existing = formData.variants.find(v => v.color === color && v.size === size);
          newVariants.push({
            color,
            size,
            stock_quantity: existing?.stock_quantity || 0,
            additional_price: existing?.additional_price || 0,
          });
        });
      });
    } else if (colorSet.size > 0) {
      formData.colors.forEach(color => {
        const existing = formData.variants.find(v => v.color === color && v.size === null);
        newVariants.push({
          color,
          size: null,
          stock_quantity: existing?.stock_quantity || 0,
          additional_price: existing?.additional_price || 0,
        });
      });
    } else if (sizeSet.size > 0) {
      formData.sizes.forEach(size => {
        const existing = formData.variants.find(v => v.color === null && v.size === size);
        newVariants.push({
          color: null,
          size,
          stock_quantity: existing?.stock_quantity || 0,
          additional_price: existing?.additional_price || 0,
        });
      });
    }

    setFormData(prev => ({ ...prev, variants: newVariants }));
  }, [formData.colors, formData.sizes]);

  useEffect(() => {
    const total = formData.variants.reduce((sum, v) => sum + v.stock_quantity, 0);
    setFormData(prev => ({ ...prev, totalStock: total }));
  }, [formData.variants]);

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
      variants: [],
      totalStock: 0,
      is_active: true,
    });
    setEditingProduct(null);
  };

  const openEditDialog = async (product: any) => {
    try {
      setEditingProduct(product);
      const category = categories.find(cat => cat.name === product.category_name);
      const categoryId = category?.id || '';
      const { data: variants } = await supabase
        .from('product_variants')
        .select(`
          id,
          stock_quantity,
          additional_price,
          colors!inner(name),
          sizes!inner(name)
        `)
        .eq('product_id', product.id);

      const existingVariants: Variant[] = variants?.map(v => ({
        color: v.colors?.name || null,
        size: v.sizes?.name || null,
        stock_quantity: v.stock_quantity || 0,
        additional_price: v.additional_price || 0,
      })) || [];

      const existingSizes = [...new Set(variants?.filter(v => v.sizes?.name).map(v => v.sizes.name) || [])];
      const existingColors = [...new Set(variants?.filter(v => v.colors?.name).map(v => v.colors.name) || [])];
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', product.id)
        .order('display_order');

      const existingImages = imagesData?.map(i => i.image_url) || [];
      const totalStock = existingVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description || '',
        category: categoryId,
        images: existingImages,
        videos: [],
        thumbnailIndex: product.thumbnail_index || 0,
        sizes: existingSizes,
        colors: existingColors,
        variants: existingVariants,
        totalStock,
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
    if (!formData.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    if (formData.variants.length === 0) {
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
        category: formData.category,
        images: formData.images,
        videos: formData.videos,
        thumbnailIndex: formData.thumbnailIndex,
        variants: formData.variants,
        is_active: formData.is_active,
      };

      if (editingProduct) {
        await updateCompleteProduct.mutateAsync({ productId: editingProduct.id, productData });
        toast({
          title: "Success",
          description: `Product "${productData.name}" updated successfully`,
        });
      } else {
        await createCompleteProduct.mutateAsync({ productData });
        toast({
          title: "Success",
          description: `Product "${productData.name}" created successfully`,
        });
      }

      setIsDialogOpen(false);
      resetForm();
      refreshProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const toggleProductStatus = async (product: any) => {
    if (!data?.pages) return;

    const originalStatus = product.is_active;
    const newStatus = !originalStatus;

    // Optimistic update
    data.pages = data.pages.map((page: any) => ({
      ...page,
      products: page.products.map((p: any) =>
        p.id === product.id ? { ...p, is_active: newStatus } : p
      ),
    }));

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus })
        .eq('id', product.id);
      if (error) throw error;

      refreshProducts();
      toast({
        title: "Success",
        description: `Product "${product.name}" ${originalStatus ? 'hidden' : 'activated'}`,
      });
    } catch (error: any) {
      // Revert optimistic update
      data.pages = data.pages.map((page: any) => ({
        ...page,
        products: page.products.map((p: any) =>
          p.id === product.id ? { ...p, is_active: originalStatus } : p
        ),
      }));
      console.error('Error toggling product status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product status",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = useCallback(
    debounce(async (productId: string, productName: string) => {
      setDeletingProductId(productId);
      if (!data?.pages) {
        setDeletingProductId(null);
        setDeleteDialogOpen(false);
        return;
      }

      let pageIndex = -1;
      let originalPageProducts: any[] = [];

      try {
        // Find the page containing the product
        pageIndex = data.pages.findIndex((page: any) => page.products.some((p: any) => p.id === productId));
        if (pageIndex === -1) {
          throw new Error('Product not found in current data');
        }

        // Store original products for this page for revert
        originalPageProducts = [...data.pages[pageIndex].products];

        // Verify admin role
        const { data: { user } } = await supabase.auth.getUser();
        const isAdminUser = user?.app_metadata?.role === 'admin';
        if (!isAdminUser) {
          throw new Error('Unauthorized: Admin access required');
        }

        // Get images before delete for storage cleanup
        const { data: images } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', productId);

        // Optimistic update: Remove product from UI
        data.pages[pageIndex].products = originalPageProducts.filter((p: any) => p.id !== productId);

        // Delete product (cascades to product_images and product_variants due to ON DELETE CASCADE)
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;

        // Clean up storage
        if (images?.length) {
          const fileNames = images
            .map((img: any) => {
              const name = img.image_url.split('/').pop();
              return name && !name.includes('default.jpg') ? name : null;
            })
            .filter((name): name is string => !!name);
          if (fileNames.length) {
            const { error: storageError } = await supabase.storage
              .from('images')
              .remove(fileNames.map((name: string) => `thumbnails/${name}`));
            if (storageError) {
              console.error('Storage cleanup error:', storageError);
            }
          }
        }

        refreshProducts();
        toast({
          title: "Success",
          description: `Product "${productName}" deleted successfully`,
        });
      } catch (error: any) {
        console.error('Error deleting product:', error);
        // Revert optimistic update: restore original products array for the page
        if (pageIndex !== -1 && data.pages && data.pages[pageIndex]) {
          data.pages[pageIndex].products = originalPageProducts;
        }
        toast({
          title: "Error",
          description: error.message || `Failed to delete product "${productName}"`,
          variant: "destructive",
        });
      } finally {
        setDeletingProductId(null);
        setDeleteDialogOpen(false);
      }
    }, 300),
    [data, refreshProducts, toast]
  );

  const addSize = (size: string) => {
    if (!formData.sizes.includes(size)) {
      setFormData(prev => ({ ...prev, sizes: [...prev.sizes, size] }));
    }
  };

  const removeSize = (size: string) => {
    setFormData(prev => ({ 
      ...prev, 
      sizes: prev.sizes.filter(s => s !== size),
      variants: prev.variants.filter(v => v.size !== size)
    }));
  };

  const addColor = (color: string) => {
    if (!formData.colors.includes(color)) {
      setFormData(prev => ({ ...prev, colors: [...prev.colors, color] }));
    }
  };

  const removeColor = (color: string) => {
    setFormData(prev => ({ 
      ...prev, 
      colors: prev.colors.filter(c => c !== color),
      variants: prev.variants.filter(v => v.color !== color)
    }));
  };

  const updateVariant = (index: number, field: 'stock_quantity' | 'additional_price', value: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const newImages: string[] = [];

    try {
      for (const file of fileArray) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(`thumbnails/${fileName}`, file, { 
            contentType: file.type,
            upsert: false 
          });
        if (uploadError) throw uploadError;

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
            className="w-full h-80 object-cover"
            onError={() => console.error(`Failed to load image: ${product.thumbnail_image}`)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              className="p-2 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={() => openEditDialog(product)}
              disabled={deletingProductId === product.id}
              aria-label={`Edit product ${product.name}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="p-2 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={() => toggleProductStatus(product)}
              disabled={deletingProductId === product.id}
              aria-label={`${product.is_active ? 'Hide' : 'Show'} product ${product.name}`}
            >
              {product.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Dialog open={deleteDialogOpen && deletingProductId === product.id} onOpenChange={(open) => {
              if (!open) setDeleteDialogOpen(false);
            }}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  className="p-2 bg-background/80 backdrop-blur-sm hover:bg-red-600"
                  onClick={() => {
                    setDeletingProductId(product.id);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={deletingProductId !== null}
                  aria-label={`Delete product ${product.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Product</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{product.name}"? This action cannot be undone. All associated images and variants will be removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={deletingProductId === product.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteProduct(product.id, product.name)}
                    disabled={deletingProductId === product.id}
                  >
                    {deletingProductId === product.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                        aria-required="true"
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
                        aria-required="true"
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
                        <SelectTrigger aria-label="Select product category">
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
                      <Label htmlFor="totalStock">Total Stock (Computed)</Label>
                      <Input
                        id="totalStock"
                        type="number"
                        value={formData.totalStock}
                        disabled
                        aria-readonly="true"
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
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => formData.sizes.includes(size) ? removeSize(size) : addSize(size)}
                          role="button"
                          aria-label={`Toggle size ${size}`}
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
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => formData.colors.includes(color) ? removeColor(color) : addColor(color)}
                          role="button"
                          aria-label={`Toggle color ${color}`}
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
                  {formData.variants.length > 0 && (
                    <div>
                      <Label>Variant Details (Stock & Additional Price)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                        {formData.variants.map((variant, index) => (
                          <div key={index} className="border p-3 rounded-lg space-y-2">
                            <p className="font-medium text-sm">
                              {variant.color || 'No Color'} / {variant.size || 'No Size'}
                            </p>
                            <div>
                              <Label className="text-xs" htmlFor={`stock-${index}`}>Stock Quantity</Label>
                              <Input
                                id={`stock-${index}`}
                                type="number"
                                value={variant.stock_quantity}
                                onChange={(e) => updateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                                className="text-xs"
                                aria-label={`Stock quantity for variant ${variant.color || 'No Color'}/${variant.size || 'No Size'}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs" htmlFor={`price-${index}`}>Additional Price</Label>
                              <Input
                                id={`price-${index}`}
                                type="number"
                                step="0.01"
                                value={variant.additional_price}
                                onChange={(e) => updateVariant(index, 'additional_price', parseFloat(e.target.value) || 0)}
                                className="text-xs"
                                aria-label={`Additional price for variant ${variant.color || 'No Color'}/${variant.size || 'No Size'}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Images</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      aria-label="Upload product images"
                    />
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
                              aria-label={`Remove image ${index + 1}`}
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
                              aria-label={`Move image ${index + 1} up`}
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
                              aria-label={`Move image ${index + 1} down`}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      aria-label="Cancel product form"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || isUpdating}
                      aria-label={editingProduct ? 'Update product' : 'Create product'}
                    >
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
                <Button
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  size="lg"
                  variant="outline"
                  aria-label="Load more products"
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