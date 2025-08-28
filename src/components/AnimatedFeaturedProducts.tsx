import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from '@/contexts/CurrencyContext';
import { useOptimizedFeatured } from '@/hooks/useOptimizedFeatured';
import { Product } from '@/types/database';

const AnimatedFeaturedProducts = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const { formatPrice } = useCurrency();
  
  // Use optimized featured products hook
  const { data: featuredProducts = [], isLoading: loading, isError } = useOptimizedFeatured();

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || featuredProducts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [featuredProducts.length, isAutoPlaying]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="h-96 bg-muted rounded-lg animate-pulse flex items-center justify-center">
            <span className="text-muted-foreground">Loading featured products...</span>
          </div>
        </div>
      </section>
    );
  }

  if (isError || featuredProducts.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Featured <span className="text-brand-beige">Collection</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our handpicked selection of premium streetwear pieces
          </p>
        </div>

        <div className="relative">
          {/* Main Carousel Container */}
          <div 
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            {featuredProducts.map((featured, index) => {
              // Transform featured product data to Product interface
              const product: Product = {
                id: featured.product_id,
                name: featured.name,
                price: featured.price,
                category: featured.category,
                images: featured.thumbnail_image ? [featured.thumbnail_image] : [],
                sizes: [], // Load on demand
                colors: [], // Load on demand
                stock_quantity: featured.stock_quantity,
                new_arrival_date: featured.new_arrival_date,
                is_active: true,
                description: null,
                videos: null,
                thumbnail_index: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              return (
                <div key={featured.id} className="w-full flex-shrink-0 px-4">
                  <Card className="overflow-hidden bg-gradient-to-br from-background to-muted/30 border-0 shadow-2xl">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Product Image */}
                      <div className="relative overflow-hidden h-96 md:h-full">
                        <img
                          src={product.images[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/20" />
                      </div>

                      {/* Product Info */}
                      <CardContent className="p-8 md:p-12 flex flex-col justify-center">
                        <div className="space-y-6">
                          <div>
                            <p className="text-sm uppercase tracking-wider text-brand-beige font-semibold mb-2">
                              Featured Product
                            </p>
                            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                              {product.name}
                            </h3>
                            <p className="text-muted-foreground mb-4 leading-relaxed">
                              {`Discover the perfect blend of style and comfort with our ${product.name}. Crafted with premium materials and attention to detail.`}
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <span className="text-3xl font-bold text-brand-beige">
                                {formatPrice(product.price)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {product.category}
                              </span>
                            </div>

                            <Button 
                              size="lg" 
                              variant="brand" 
                              className="w-full md:w-auto px-8"
                              onClick={() => window.location.href = `/product/${product.id}`}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows */}
          {featuredProducts.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                onClick={prevSlide}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                onClick={nextSlide}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Dots Indicator */}
          {featuredProducts.length > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              {featuredProducts.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-brand-beige shadow-lg scale-110' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AnimatedFeaturedProducts;