import { useState, useCallback } from "react";
import { MinimalProductCard } from "./MinimalProductCard";
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

  // Fetch admin-created categories
  const { data: adminCategories, isLoading: categoriesLoading } = useCategories();
  
  // Create category mapping for proper filtering
  const categoryMap = new Map<string, string>([
    ["all", "all"],
    ...(adminCategories?.map(cat => [cat.name.toLowerCase(), cat.name] as [string, string]) || [])
  ]);
  
  // Prepare categories array with "all" first, then admin categories (lowercase for display)
  const categories = ["all", ...(adminCategories?.map(cat => cat.name.toLowerCase()) || [])];

  // Fetch ALL products for category grouping - using correct page size
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
    category: selectedCategory === "all" ? "all" : categoryMap.get(selectedCategory) || "all",
    pageSize: 20 // Optimized batch size for fast loading
  });

  // Ultra-fast products with proper typing
  const allProducts: UltraFastProduct[] = data?.pages.flatMap(page => page.products) || [];
  
  // Handle category change by resetting the query
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  // Handle load more
  const handleLoadMore = useCallback(() => {
    console.log('Load more clicked:', { hasNextPage, isFetchingNextPage });
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle retry
  const handleRetry = () => {
    refetch();
  };

  console.log('🔍 ProductsSection state:', {
    selectedCategory,
    allProductsLength: allProducts.length,
    hasNextPage,
    isLoading,
    isError
  });

  // Show initial loading state
  if (isLoading && allProducts.length === 0) {
    return (
      <section id="products" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loading Our <span className="text-brand-beige">Collection</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Please wait while we load our premium streetwear pieces...
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
        ) : allProducts.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            No products available at the moment.
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {allProducts.map((product, productIndex) => (
                <div key={product.id} className="animate-scale-in" style={{ animationDelay: `${productIndex * 50}ms` }}>
                  <MinimalProductCard
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      category: product.category,
                      stock_quantity: product.stock_quantity,
                      is_active: true,
                      thumbnail_image: product.thumbnail_image,
                      images: product.thumbnail_image ? [product.thumbnail_image] : [],
                      colors: [],
                      sizes: [],
                      new_arrival_date: product.new_arrival_date,
                      created_at: product.created_at,
                      updated_at: product.created_at,
                      has_colors: product.has_colors,
                      has_sizes: product.has_sizes,
                      description: '',
                      thumbnail_index: 0
                    }}
                    onAddToCart={onAddToCart}
                    priority={productIndex < 8}
                  />
                </div>
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
                  className="bg-background hover:bg-muted hover-scale transition-all duration-300"
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