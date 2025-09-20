import { useState, useCallback } from "react";
import ProductCard from "./ProductCard";
import { UltraFastProductCard } from "./UltraFastProductCard";
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

  // Fetch ALL products for category grouping
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
    category: "all", // Always fetch all to group by categories
    pageSize: 50 // Larger batch for category grouping
  });

  // Ultra-fast products with proper typing
  const allProducts: UltraFastProduct[] = data?.pages.flatMap(page => page.products) || [];
  
  // Group products by category, only show categories with visible products
  const productsByCategory = allProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, UltraFastProduct[]>);

  // Filter categories to only show those that have products
  const categoriesWithProducts = Object.keys(productsByCategory).sort();
  
  // If a specific category is selected, show only that category's products
  const filteredCategories = selectedCategory === "all" 
    ? categoriesWithProducts 
    : categoriesWithProducts.filter(cat => cat.toLowerCase() === selectedCategory);

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
            {/* Display products grouped by categories */}
            <div className="space-y-16">
              {filteredCategories.map((categoryName, categoryIndex) => {
                const categoryProducts = productsByCategory[categoryName] || [];
                
                // Skip empty categories
                if (categoryProducts.length === 0) return null;
                
                let globalIndex = 0;
                
                // Calculate global index for priority loading
                for (let i = 0; i < categoryIndex; i++) {
                  globalIndex += (productsByCategory[filteredCategories[i]] || []).length;
                }
                
                return (
                  <div key={categoryName} className="animate-fade-in">
                    {/* Category Header - only show if displaying all categories */}
                    {selectedCategory === "all" && (
                      <div className="mb-8 text-center">
                        <h3 className="text-3xl font-bold capitalize bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                          {categoryName}
                        </h3>
                        <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Products Grid for this category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {categoryProducts.map((product, productIndex) => (
                        <div key={product.id} className="animate-scale-in" style={{ animationDelay: `${productIndex * 100}ms` }}>
                          <UltraFastProductCard
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
                            priority={globalIndex + productIndex < 8}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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