import { useState, useRef, useEffect } from "react";
import { Plus, Minus, Heart, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product, ProductImage, ProductSizeInfo, ProductColorInfo } from '@/types/database';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import ChatWidget from './ChatWidget';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  // Helper functions to get display values from mixed data types
  const getImageUrl = (image: string | ProductImage) => {
    return typeof image === 'string' ? image : image.image_url;
  };

  const getSizeName = (size: string | ProductSizeInfo) => {
    return typeof size === 'string' ? size : size.name;
  };

  const getColorName = (color: string | ProductColorInfo) => {
    return typeof color === 'string' ? color : color.name;
  };

  // Get first available options or empty strings
  const firstSize = product.sizes?.[0] ? getSizeName(product.sizes[0]) : '';
  const firstColor = product.colors?.[0] ? getColorName(product.colors[0]) : '';
  
  const [selectedSize, setSelectedSize] = useState(firstSize);
  const [selectedColor, setSelectedColor] = useState(firstColor);
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleAddToCart = () => {
    const hasRealSizes = product.sizes && product.sizes.length > 0;
    const hasRealColors = product.colors && product.colors.length > 0;
    
    if (hasRealSizes && !selectedSize) {
      toast({
        title: "Size Required",
        description: "Please select a size before adding to cart",
        variant: "destructive"
      });
      return;
    }
    if (hasRealColors && !selectedColor) {
      toast({
        title: "Color Required", 
        description: "Please select a color before adding to cart",
        variant: "destructive"
      });
      return;
    }
    if (product.stock_quantity === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive"
      });
      return;
    }
    onAddToCart(product, quantity, selectedSize, selectedColor);
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const handleWishlistToggle = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  const getStockStatus = () => {
    if (product.stock_quantity === 0) {
      return { status: 'out', message: 'Out of Stock', variant: 'destructive' as const };
    } else if (product.stock_quantity <= 5) {
      return { status: 'low', message: `Only ${product.stock_quantity} left`, variant: 'secondary' as const };
    }
    return null;
  };

  const isNewArrival = () => {
    if (!product.new_arrival_date) return false;
    
    const arrivalDate = new Date(product.new_arrival_date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24));
    
    // Only show if within 10 days
    return daysDiff <= 10;
  };

  const stockStatus = getStockStatus();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <Card 
      className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] cursor-pointer" 
      onClick={handleCardClick}
    >
      <div className="relative overflow-hidden">
        <div className="relative">
          <div ref={imgRef} className="w-full h-80 bg-muted/50 flex items-center justify-center">
            {isVisible && (
              <>
                <img
                  src={getImageUrl(product.images?.[0] || '/placeholder.svg')}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {/* Preload next image for faster navigation */}
                {product.images?.[1] && (
                  <link rel="preload" as="image" href={getImageUrl(product.images[1])} />
                )}
              </>
            )}
            {!imageLoaded && isVisible && (
              <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse" />
            )}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            className="p-2 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product/${product.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {user && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="p-2 bg-background/80 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWishlistToggle();
                }}
              >
                <Heart 
                  className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} 
                />
              </Button>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <ChatWidget 
                  productId={product.id} 
                  productName={product.name}
                />
              </div>
            </>
          )}
        </div>

        {/* New Arrival Badge */}
        {isNewArrival() && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-lg animate-pulse">
              <span className="text-xs font-semibold">New Arrival</span>
            </Badge>
          </div>
        )}

        {/* Stock status badge */}
        {stockStatus && (
          <div className="absolute bottom-2 left-2">
            <Badge variant={stockStatus.variant} className="text-xs">
              {stockStatus.message}
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.category}</p>
            <p className="text-2xl font-bold text-brand-beige mt-2">{formatPrice(product.price)}</p>
          </div>

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <label className="text-sm font-medium text-foreground block mb-2">Size</label>
              <div className="flex gap-2">
                {product.sizes.map((size, index) => {
                  const sizeName = getSizeName(size);
                  return (
                    <button
                      key={`${sizeName}-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSize(sizeName);
                      }}
                      className={`px-3 py-1 border rounded text-sm transition-colors ${
                        selectedSize === sizeName
                          ? "bg-brand-beige text-brand-beige-foreground border-brand-beige"
                          : "border-border hover:border-brand-beige"
                      }`}
                    >
                      {sizeName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {product.colors && product.colors.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <label className="text-sm font-medium text-foreground block mb-2">Color</label>
              <div className="flex gap-2">
                {product.colors.map((color, index) => {
                  const colorName = getColorName(color);
                  return (
                    <button
                      key={`${colorName}-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedColor(colorName);
                      }}
                      className={`px-3 py-1 border rounded text-sm transition-colors capitalize ${
                        selectedColor === colorName
                          ? "bg-brand-beige text-brand-beige-foreground border-brand-beige"
                          : "border-border hover:border-brand-beige"
                      }`}
                    >
                      {colorName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div onClick={(e) => e.stopPropagation()}>
            <label className="text-sm font-medium text-foreground block mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(Math.max(1, quantity - 1));
                }}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(quantity + 1);
                }}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button 
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            className="w-full"
            variant="brand"
            size="lg"
          >
            Add to Cart
          </Button>
        </div>
      </CardContent>
      
    </Card>
  );
};

export default ProductCard;