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
import NewArrivalBadge from './NewArrivalBadge';

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
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
      <div className="relative overflow-hidden">
        <NewArrivalBadge newArrivalDate={product.new_arrival_date} />
        <div 
          className="cursor-pointer"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          <img
            src={product.images[0] || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            className="p-2 bg-background/80 backdrop-blur-sm"
            onClick={() => navigate(`/product/${product.id}`)}
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
              <div className="relative">
                <ChatWidget 
                  productId={product.id} 
                  productName={product.name}
                />
              </div>
            </>
          )}
        </div>

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
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Size</label>
            <div className="flex gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-1 border rounded text-sm transition-colors ${
                    selectedSize === size
                      ? "bg-brand-beige text-brand-beige-foreground border-brand-beige"
                      : "border-border hover:border-brand-beige"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Color</label>
            <div className="flex gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-3 py-1 border rounded text-sm transition-colors capitalize ${
                    selectedColor === color
                      ? "bg-brand-beige text-brand-beige-foreground border-brand-beige"
                      : "border-border hover:border-brand-beige"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleAddToCart}
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