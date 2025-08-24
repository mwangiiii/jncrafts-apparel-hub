import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewArrivalBadge from './NewArrivalBadge';

interface FeaturedProduct {
  id: string;
  display_order: number;
  product: {
    id: string;
    name: string;
    images: string[];
    price: number;
    new_arrival_date?: string;
  };
}

const AnimatedFeaturedProducts = () => {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      const { data } = await supabase
        .from('homepage_featured')
        .select(`
          id,
          display_order,
          products:product_id (
            id,
            name,
            images,
            price,
            new_arrival_date
          )
        `)
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        const transformedData = data
          .filter(item => item.products)
          .map(item => ({
            id: item.id,
            display_order: item.display_order,
            product: item.products as any
          }));
        setFeaturedProducts(transformedData);
      }
    };

    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    if (!isAutoPlay || featuredProducts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [featuredProducts.length, isAutoPlay]);

  if (featuredProducts.length === 0) return null;

  const currentProduct = featuredProducts[currentIndex]?.product;
  if (!currentProduct) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredProducts.length);
    setIsAutoPlay(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    setIsAutoPlay(false);
  };

  return (
    <section className="relative h-80 md:h-96 overflow-hidden rounded-xl bg-gradient-to-r from-background/50 to-muted/30 border border-border/20">
      <div className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
           style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {featuredProducts.map((item, index) => (
          <div key={item.id} className="w-full flex-shrink-0 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
            {item.product.images?.[0] && (
              <img
                src={item.product.images[0]}
                alt={item.product.name}
                className="w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
            )}
            <NewArrivalBadge newArrivalDate={item.product.new_arrival_date} />
            <div className="absolute bottom-4 left-4 z-20 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-brand-beige bg-clip-text text-transparent">
                {item.product.name}
              </h3>
              <p className="text-lg md:text-xl font-semibold">
                KES {item.product.price?.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {featuredProducts.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={nextSlide}
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </Button>
          
          <div className="absolute bottom-4 right-4 flex gap-2 z-20">
            {featuredProducts.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                }`}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlay(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default AnimatedFeaturedProducts;