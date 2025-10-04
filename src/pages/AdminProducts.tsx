import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, Eye, EyeOff, Package, Loader2, ChevronUp, ChevronDown, Upload, Image, Palette, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/AdminHeader';
import { useAdminProducts, useRefreshAdminProducts } from '@/hooks/useAdminProducts';
import { useCompleteProductManagement } from '@/hooks/useCompleteProductManagement';
import AdminProductCardSkeleton from '@/components/admin/AdminProductCardSkeleton';
import AdminProductsErrorBoundary from '@/components/admin/AdminProductsErrorBoundary';
import AdminProductsLoadingFallback from '@/components/admin/AdminProductsLoadingFallback';
import OptimizedAdminImage from '@/components/admin/OptimizedAdminImage';
import debounce from 'lodash/debounce';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hex_code: string | null;
}

interface Size {
  id: string;
  name: string;
}

interface Variant {
  id?: string;
  color_id: string | null;
  size_id: string | null;
  stock_quantity: number;
  additional_price: number;
  color?: Color;
  size?: Size;
}

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
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
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]); // IDs
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]); // IDs
  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Form state aligned with normalized schema
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    is_active: true,
  });

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Category fetch error:', error);
      toast({
        title: "Category Fetch Error",
        description: error.message || "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  const fetchColors = async () => {
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('id, name, hex_code')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      setColors(data || []);
    } catch (error: any) {
      console.error('Color fetch error:', error);
      toast({
        title: "Color Fetch Error",
        description: error.message || "Failed to fetch colors",
        variant: "destructive",
      });
    }
  };

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('sizes')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      setSizes(data || []);
    } catch (error: any) {
      console.error('Size fetch error:', error);
      toast({
        title: "Size Fetch Error",
        description: error.message || "Failed to fetch sizes",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      Promise.all([fetchCategories(), fetchColors(), fetchSizes()]);
      refetch();
    }
  }, [user, isAdmin, refetch]);

  // Sync variants with selected colors and sizes without resetting existing data
  useEffect(() => {
    setVariants(prevVariants => {
      // Filter out variants not in current selections
      const updatedVariants = prevVariants.filter(v =>
        (v.color_id === null || selectedColors.includes(v.color_id)) &&
        (v.size_id === null || selectedSizes.includes(v.size_id))
      );

      // Add missing combinations with default values
      const existingCombos = new Set(updatedVariants.map(v => `${v.color_id || 'null'}-${v.size_id || 'null'}`));

      selectedColors.forEach(colorId => {
        selectedSizes.forEach(sizeId => {
          const key = `${colorId}-${sizeId}`;
          if (!existingCombos.has(key)) {
            updatedVariants.push({
              color_id: colorId,
              size_id: sizeId,
              stock_quantity: 0,
              additional_price: 0,
              color: colors.find(c => c.id === colorId),
              size: sizes.find(s => s.id === sizeId),
            });
          }
        });
      });

      return updatedVariants;
    });
  }, [selectedColors, selectedSizes, colors, sizes]);

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
      is_active: true,
    });
    setSelectedColors([]);
    setSelectedSizes([]);
    setVariants([]);
    setImages([]);
    setThumbnailIndex(0);
    setIsActive(true);
    setEditingProduct(null);
  };

  const openEditDialog = async (product: any) => {
    try {
      setEditingProduct(product);
      const categoryId = product.category; // Direct FK from schema
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select(`
          id,
          stock_quantity,
          additional_price,
          color_id,
          size_id,
          colors!inner(id, name, hex_code),
          sizes!inner(id, name)
        `)
        .eq('product_id', product.id);

      const existingVariants: Variant[] = variantsData?.map((v: any) => ({
        id: v.id,
        color_id: v.color_id,
        size_id: v.size_id,
        stock_quantity: v.stock_quantity || 0,
        additional_price: v.additional_price || 0,
        color: v.colors,
        size: v.sizes,
      })) || [];

      const existingColorIds = [...new Set(variantsData?.map((v: any) => v.color_id).filter(Boolean))];
      const existingSizeIds = [...new Set(variantsData?.map((v: any) => v.size_id).filter(Boolean))];

      const { data: imagesData } = await supabase
        .from('product_images')
        .select('id, image_url, display_order, is_primary')
        .eq('product_id', product.id)
        .order('display_order');

      setFormData({
        name: product.name,
        price: product.price.toString(),
        description: product.description || '',
        category: categoryId,
        is_active: product.is_active,
      });
      setSelectedColors(existingColorIds);
      setSelectedSizes(existingSizeIds);
      setVariants(existingVariants);
      setImages(imagesData || []);
      setThumbnailIndex(product.thumbnail_index || 0);
      setIsActive(product.is_active);
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
    if (variants.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one color and size combination",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        variants: variants.map(v => ({
          color_id: v.color_id,
          size_id: v.size_id,
          stock_quantity: v.stock_quantity,
          additional_price: v.additional_price,
        })),
        images: images.map(img => ({
          image_url: img.image_url,
          display_order: img.display_order,
          is_primary: img.display_order === 0, // First is primary
        })),
        thumbnail_index: thumbnailIndex,
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
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);
      if (error) throw error;
      refreshProducts();
      toast({
        title: "Success",
        description: `Product "${product.name}" ${product.is_active ? 'hidden' : 'activated'}`,
      });
    } catch (error: any) {
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
      try {
        // Verify admin role
        const { data: { user } } = await supabase.auth.getUser();
        const isAdminUser = user?.app_metadata?.role === 'admin';
        if (!isAdminUser) {
          throw new Error('Unauthorized: Admin access required');
        }

        // Optimistic update
        const originalProducts = products;
        data!.pages = data!.pages.map(page => ({
          ...page,
          products: page.products.filter(p => p.id !== productId),
        }));

        // Delete product (cascades to variants/images)
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;

        refreshProducts();
        toast({
          title: "Success",
          description: `Product "${productName}" deleted successfully`,
        });
      } catch (error: any) {
        console.error('Error deleting product:', error);
        // Revert optimistic update
        data!.pages = data!.pages.map((page, pageIndex) => ({
          ...page,
          products: originalProducts.slice(
            pageIndex * (data!.pages[pageIndex].products.length / data!.pages.length), // Approximate revert
            (pageIndex + 1) * (data!.pages[pageIndex].products.length / data!.pages.length)
          ),
        }));
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
    [data, products, toast, refreshProducts]
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const newImages: ProductImage[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(`thumbnails/${fileName}`, file, { 
            contentType: file.type,
            upsert: false 
          });
        if (uploadError) throw uploadError;

        const imageUrl = supabase.storage.from('images').getPublicUrl(`thumbnails/${fileName}`).data.publicUrl;
        newImages.push({
          id: `temp-${Date.now()}-${i}`,
          image_url: imageUrl,
          display_order: images.length + i,
          is_primary: false,
        });
      }

      setImages(prev => [...prev, ...newImages]);
      toast({
        title: "Images added",
        description: `Added ${newImages.length} image(s)`,
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
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newImages.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      // Update display_order to match new positions
      newImages.forEach((img, i) => {
        img.display_order = i;
      });
      setImages(newImages);
    }
  };

  const updateVariantStock = (index: number, value: number) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, stock_quantity: value } : v));
  };

  const updateVariantPrice = (index: number, value: number) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, additional_price: value } : v));
  };

  if (loading) return <AdminProductsLoadingFallback />;
  if (!user || !isAdmin) return <Navigate to="/auth" replace />;

  const AdminProductCard = ({ product }: { product: any }) => {
    return (
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0">
        <div className="relative overflow-hidden bg-muted/50">
          <OptimizedAdminImage
            src={product.thumbnail_image || '/placeholder-product.jpg'}
            alt={product.name}
            className="w-full h-80 object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-product.jpg';
              console.error(`Failed to load image: ${product.thumbnail_image}`);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              variant="outline"
              className="p-2 bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={() => openEditDialog(product)}
              disabled={deletingProductId === product.id}
              aria-label={`Edit product ${product.name}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="p-2 bg-background/90 backdrop-blur-sm hover:bg-background"
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
                  className="p-2 bg-background/90 backdrop-blur-sm hover:bg-red-600"
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
                    Are you sure you want to delete "{product.name}"? This action cannot be undone. All associated variants and images will be removed due to CASCADE.
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
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {!product.is_active && (
              <Badge variant="destructive" className="text-xs px-2 py-1">Hidden</Badge>
            )}
            {product.new_arrival_date && (
              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 shadow-md">New Arrival</Badge>
            )}
          </div>
          {product.stock_quantity <= 5 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant={product.stock_quantity === 0 ? "destructive" : "secondary"} className="text-xs px-2 py-1">
                {product.stock_quantity === 0 ? 'Out of Stock' : `Low Stock (${product.stock_quantity})`}
              </Badge>
            </div>
          )}
          {product.total_images > 1 && (
            <div className="absolute bottom-3 right-3 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-full px-3 py-1 text-xs font-medium shadow-lg">
              {product.total_images} imgs
            </div>
          )}
        </div>
        <CardContent className="p-6 bg-gradient-to-b from-background to-muted/30">
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold line-clamp-1">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.category_name}</p>
              <p className="text-2xl font-bold text-primary mt-1">KSh {product.price.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <span className="font-medium text-muted-foreground">Stock</span>
                <Badge variant="secondary" className="w-fit">{product.stock_quantity}</Badge>
              </div>
              <div className="space-y-1">
                <span className="font-medium text-muted-foreground">Colors</span>
                <Badge variant="secondary" className="w-fit">{product.colors_count || 0}</Badge>
              </div>
              <div className="space-y-1">
                <span className="font-medium text-muted-foreground">Sizes</span>
                <Badge variant="secondary" className="w-fit">{product.sizes_count || 0}</Badge>
              </div>
              <div className="space-y-1">
                <span className="font-medium text-muted-foreground">Images</span>
                <Badge variant="secondary" className="w-fit">{product.total_images}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading skeleton for products grid
  const ProductsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-96 w-full rounded-lg" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <AdminHeader />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Header */}
        <div className="mb-8 p-8 rounded-3xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-2xl border-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold">Product Management</h1>
              <p className="text-primary-foreground/90 text-lg">Create, edit, and optimize your JNCRAFTS apparel collection</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg px-8">
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
                <DialogHeader className="p-6 border-b">
                  <DialogTitle className="text-2xl">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Fill in the details below. Variants will be generated from selected colors and sizes.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                        placeholder="e.g., Premium Cotton T-Shirt"
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Base Price (KES) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        required
                        placeholder="e.g., 2500"
                        aria-required="true"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      placeholder="Enter product description..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={categories.length > 0 ? "Select a category" : "Loading categories..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {categories.length === 0 && (
                        <p className="text-xs text-destructive">Add categories in Admin → Categories first</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Total Variants</Label>
                      <Input
                        type="number"
                        value={variants.length}
                        disabled
                        className="bg-muted"
                        aria-readonly="true"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Select Colors
                      </Label>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {colors.map(color => (
                          <div key={color.id} className="space-y-1">
                            <Checkbox
                              id={`color-${color.id}`}
                              checked={selectedColors.includes(color.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedColors(prev => [...prev, color.id]);
                                } else {
                                  setSelectedColors(prev => prev.filter(id => id !== color.id));
                                }
                              }}
                              aria-label={`Select color ${color.name}`}
                            />
                            <Label htmlFor={`color-${color.id}`} className="cursor-pointer text-xs flex items-center gap-1">
                              <div 
                                className="w-4 h-4 rounded-full border" 
                                style={{ backgroundColor: color.hex_code || 'currentColor' }}
                              />
                              {color.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Select Sizes
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {sizes.map(size => (
                          <div key={size.id} className="space-y-1">
                            <Checkbox
                              id={`size-${size.id}`}
                              checked={selectedSizes.includes(size.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSizes(prev => [...prev, size.id]);
                                } else {
                                  setSelectedSizes(prev => prev.filter(id => id !== size.id));
                                }
                              }}
                              aria-label={`Select size ${size.name}`}
                            />
                            <Label htmlFor={`size-${size.id}`} className="cursor-pointer text-xs">
                              {size.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {variants.length > 0 && (
                    <div className="space-y-3">
                      <Label>Variant Inventory & Pricing</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {variants.map((variant, index) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-2">
                              <p className="font-medium text-sm flex items-center gap-1">
                                <Palette className="h-3 w-3 text-muted-foreground" />
                                {variant.color?.name || 'N/A'}
                                <span className="mx-1">/</span>
                                <Ruler className="h-3 w-3 text-muted-foreground" />
                                {variant.size?.name || 'N/A'}
                              </p>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs">Stock</Label>
                                  <Input
                                    type="number"
                                    value={variant.stock_quantity}
                                    onChange={(e) => updateVariantStock(index, parseInt(e.target.value) || 0)}
                                    className="text-xs"
                                    min={0}
                                    aria-label={`Stock for ${variant.color?.name}/${variant.size?.name}`}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Add'l Price (KES)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.additional_price}
                                    onChange={(e) => updateVariantPrice(index, parseFloat(e.target.value) || 0)}
                                    className="text-xs"
                                    min={0}
                                    aria-label={`Additional price for ${variant.color?.name}/${variant.size?.name}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Product Images (Drag to reorder)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      aria-label="Upload product images"
                    />
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-3 p-4 bg-muted rounded-lg">
                        {images.map((image, index) => (
                          <div key={image.id} className="relative group">
                            <img 
                              src={image.image_url} 
                              alt={`Preview ${index + 1}`} 
                              className="w-24 h-24 object-cover rounded-lg shadow-md" 
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-background"
                              onClick={() => removeImage(index)}
                              aria-label={`Remove image ${index + 1}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute -top-2 left-6 h-6 w-6 p-0 bg-background"
                              onClick={() => moveImage(index, 'up')}
                              disabled={index === 0}
                              aria-label={`Move image ${index + 1} up`}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute bottom-0 left-6 h-6 w-6 p-0 bg-background"
                              onClick={() => moveImage(index, 'down')}
                              disabled={index === images.length - 1}
                              aria-label={`Move image ${index + 1} down`}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: !!checked }))}
                      aria-label="Make product active"
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Make product visible on storefront
                    </Label>
                  </div>
                  <DialogFooter className="gap-3">
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
                      disabled={isCreating || isUpdating || variants.length === 0}
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
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {error ? (
          <AdminProductsErrorBoundary error={error} onRetry={refetch} isRetrying={isLoading} />
        ) : isLoading ? (
          <AdminProductsLoadingFallback>
            <ProductsSkeleton />
          </AdminProductsLoadingFallback>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
            <p className="text-muted-foreground mb-6">Start by adding your first product to showcase your collection.</p>
            <Button onClick={resetForm} size="lg" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Product
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <AdminProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasNextPage && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  size="lg"
                  variant="outline"
                  className="px-8"
                  aria-label="Load more products"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading More...
                    </>
                  ) : (
                    <>
                      Load More ({hasNextPage ? '∞' : '0'}) Products
                    </>
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