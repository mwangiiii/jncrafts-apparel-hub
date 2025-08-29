import { useState, useCallback } from "react";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import CategoryDropdown from "./CategoryDropdown";
import { Product } from '@/types/database';
import { useUltraFastProducts, type UltraFastProduct } from '@/hooks/useUltraFastProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProductsSectionProps {
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
}

const ProductsSection = ({ onAddToCart }: ProductsSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Use ultra-fast infinite products hook for <100ms loading
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useUltraFastProducts({ 
    category: selectedCategory,
    pageSize: 12 // Optimized batch size for performance
  });

  // Ultra-fast products with proper typing
  const products: UltraFastProduct[] = data?.pages.flatMap(page => page.products) || [];
  
  // Fetch admin-created categories
  const { data: adminCategories, isLoading: categoriesLoading } = useCategories();
  
  // Prepare categories array with "all" first, then admin categories
  const categories = ["all", ...(adminCategories?.map(cat => cat.name.toLowerCase()) || [])];

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle retry
  const handleRetry = () => {
    refetch();
  };

  // Show initial loading state
  if (isLoading && products.length === 0) {
    return (
      <section id="products" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Our <span className="text-brand-beige">Collection</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover our premium streetwear pieces, crafted with attention to detail 
              and designed for comfort and style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 16 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Our <span className="text-brand-beige">Collection</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover our premium streetwear pieces, crafted with attention to detail 
            and designed for comfort and style.
          </p>
        </div>

        {/* Category Filter with Dropdown */}
        {!categoriesLoading && (
          <CategoryDropdown
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            maxVisibleCategories={4}
          />
        )}

        {/* Products Grid */}
        {isError ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-lg mb-2">Failed to load products</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message?.includes('Failed to fetch')
                ? "Connection issue, please check your internet and try again"
                : error?.message || "There was an error loading products"
              }
            </p>
            <Button onClick={handleRetry} variant="outline">
              Try Again
            </Button>
          </div>
        ) : products.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            No products found in this category.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    stock_quantity: product.stock_quantity,
                    is_active: true,
                    images: product.thumbnail_image ? [product.thumbnail_image] : [],
                    colors: [],
                    sizes: [],
                    new_arrival_date: product.new_arrival_date,
                    created_at: product.created_at,
                    updated_at: product.created_at,
                    // Include variant flags for better UX
                    has_colors: product.has_colors,
                    has_sizes: product.has_sizes,
                  }}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-12">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={isFetchingNextPage}
                  size="lg"
                  variant="outline"
                  className="bg-background hover:bg-muted"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading more products...
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
    </section>
  );
};

export default ProductsSection;