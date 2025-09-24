import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProducts, useRefreshAdminProducts } from '@/hooks/useAdminProducts';
import { UltraFastImage } from '../UltraFastImage';
import { 
  Package, 
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Move
} from 'lucide-react';
import { ProductImageReorder } from './ProductImageReorder';

interface OptimizedProductsSectionProps {
  onOpenProductDialog: () => void;
  onEditProduct: (product: any) => void;
}

export const OptimizedProductsSection = ({ onOpenProductDialog, onEditProduct }: OptimizedProductsSectionProps) => {
  const { toast } = useToast();
  const [reorderProductId, setReorderProductId] = useState<string | null>(null);
  
  // Use standard products hook
  const {
    data: productsData,
    isLoading: loadingProducts,
    error: productsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAdminProducts({ pageSize: 20, enabled: true });
  
  const { refreshProducts } = useRefreshAdminProducts();

  // Flatten products from paginated data
  const products = productsData?.pages.flatMap(page => page.products) || [];

  const toggleProductStatus = async (product: any) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      
      await refreshProducts();
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
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      await refreshProducts();
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

  const handleRefresh = async () => {
    try {
      await refreshProducts();
      toast({
        title: "Success",
        description: "Products refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast({
        title: "Error",
        description: "Failed to refresh products",
        variant: "destructive"
      });
    }
  };

  if (productsError) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-destructive">Error loading products: {productsError.message}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="admin-card border-0 shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Products Management
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={onOpenProductDialog} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingProducts && products.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Create your first product to get started</p>
            <Button onClick={onOpenProductDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Product
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product: any, index: number) => (
                <Card key={product.id} className="product-card overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="relative aspect-square">
                    <UltraFastImage
                      src={product.thumbnail_image}
                      alt={product.name}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      priority={index < 8} // First 8 images are priority loaded
                    />
                    {product.stock_quantity < 10 && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg line-clamp-2">{product.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReorderProductId(product.id)}
                            className="h-8 w-8 p-0"
                            title="Reorder images"
                          >
                            <Move className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleProductStatus(product)}
                            className="h-8 w-8 p-0"
                            title={product.is_active ? "Hide product" : "Show product"}
                          >
                            {product.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditProduct(product)}
                            className="h-8 w-8 p-0"
                            title="Edit product"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteProduct(product.id)}
                            className="h-8 w-8 p-0"
                            title="Delete product"
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
                        <p><span className="font-medium">Images:</span> {product.total_images || 0}</p>
                        <p><span className="font-medium">Has Colors:</span> {product.has_colors ? 'Yes' : 'No'}</p>
                        <p><span className="font-medium">Has Sizes:</span> {product.has_sizes ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  size="lg"
                >
                  {isFetchingNextPage ? 'Loading More Products...' : 'Load More Products'}
                </Button>
              </div>
            )}
          </>
        )}
        
        {/* Image Reorder Dialog */}
        {reorderProductId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <ProductImageReorder
              productId={reorderProductId}
              onClose={() => setReorderProductId(null)}
              onUpdate={handleRefresh}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};