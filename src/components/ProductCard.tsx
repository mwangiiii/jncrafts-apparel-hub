import { useState } from "react";
import { Plus, Minus, Heart, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from '@/types/database';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import ChatWidget from './ChatWidget';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || '');
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      alert('Please select both size and color');
      return;
    }
    onAddToCart(product, quantity, selectedSize, selectedColor);
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

  const stockStatus = getStockStatus();

  return (
    <Card className="group overflow-hidden hover-lift hover:shadow-xl transition-all duration-300 w-full">
      {/* Product Image Container - Responsive */}
      <div className="relative overflow-hidden">
        <div 
          className="cursor-pointer tap-highlight"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          <img
            src={product.images[0] || '/placeholder.svg'}
            alt={`${product.name} - ${product.category} from jnCrafts collection`}
            className="responsive-product-img transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            srcSet={product.images[0] ? `${product.images[0]} 1x` : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Action buttons overlay - Mobile optimized */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            className="touch-target tap-highlight p-2 bg-background/90 backdrop-blur-sm border-border/50 hover:bg-background shadow-sm"
            onClick={() => navigate(`/product/${product.id}`)}
            aria-label={`View details for ${product.name}`}
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          
          {user && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="touch-target tap-highlight p-2 bg-background/90 backdrop-blur-sm border-border/50 hover:bg-background shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWishlistToggle();
                }}
                aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              >
                <Heart 
                  className={`h-3 w-3 sm:h-4 sm:w-4 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} 
                />
              </Button>
              
              <div className="relative">
                <ChatWidget 
                  productId={product.id} 
                  productName={product.name}
                />
              </div>
            </>
          )}
        </div>

        {/* Stock status badge - Mobile optimized */}
        {stockStatus && (
          <div className="absolute bottom-2 left-2">
            <Badge variant={stockStatus.variant} className="text-xs px-2 py-1">
              {stockStatus.message}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Product Details - Mobile optimized layout */}
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-3 sm:space-y-4">
          {/* Product Info */}
          <div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground line-clamp-2">{product.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground capitalize">{product.category}</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-brand-beige mt-1 sm:mt-2">{formatPrice(product.price)}</p>
          </div>

          {/* Size Selection - Mobile optimized */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground block mb-2">Size</label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`touch-target tap-highlight px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm transition-colors ${
                    selectedSize === size
                      ? "bg-brand-beige text-brand-beige-foreground border-brand-beige"
                      : "border-border hover:border-brand-beige"
                  }`}
                  aria-label={`Select size ${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection - Mobile optimized */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground block mb-2">Color</label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`touch-target tap-highlight px-2 sm:px-3 py-1 border rounded text-xs sm:text-sm transition-colors capitalize ${
                    selectedColor === color
                      ? "bg-brand-beige text-brand-beige-foreground border-brand-beige"
                      : "border-border hover:border-brand-beige"
                  }`}
                  aria-label={`Select color ${color}`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector - Mobile optimized */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-foreground block mb-2">Quantity</label>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-8 w-8 touch-target tap-highlight"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-sm sm:text-lg font-medium w-8 text-center" aria-label={`Quantity: ${quantity}`}>
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="h-8 w-8 touch-target tap-highlight"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart Button - Full width on mobile */}
          <Button 
            onClick={handleAddToCart}
            className="w-full touch-target tap-highlight text-sm sm:text-base py-2 sm:py-3"
            variant="brand"
            size="lg"
            disabled={product.stock_quantity === 0}
            aria-label={`Add ${product.name} to cart`}
          >
            {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;