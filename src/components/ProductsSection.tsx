import { useState, useCallback } from "react";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";
import { Product } from '@/types/database';
import { useInfiniteProducts } from '@/hooks/useInfiniteProducts';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProductsSectionProps {
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
}

const ProductsSection = ({ onAddToCart }: ProductsSectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Use optimized infinite products hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteProducts({ 
    category: selectedCategory,
    pageSize: 12 // Smaller batch for better performance
  });

  const products = data?.pages.flatMap(page => page.products) || [];
  
  // Hardcoded categories for better performance - no need to derive from data
  const categories = ["all", "hoodies", "jackets", "pants", "croptops", "customized tshirts", "2 piece set", "skull caps"];

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

        {/* Category Filter */}
        <div className="flex justify-center mb-12">
          <div className="flex flex-wrap gap-2 bg-background rounded-lg p-2 shadow-lg">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-6 py-2 rounded-md transition-all duration-300 capitalize ${
                  selectedCategory === category
                    ? "bg-brand-beige text-brand-beige-foreground shadow-md"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {isError ? (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-lg mb-2">Failed to load products</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.code === '57014' 
                ? "Database is busy, please try again in a moment" 
                : error?.message?.includes('Failed to fetch')
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
                  product={product}
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