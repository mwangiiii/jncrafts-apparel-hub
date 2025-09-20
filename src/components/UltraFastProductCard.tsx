import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { UltraFastImage } from './UltraFastImage';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/database';

interface UltraFastProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
  priority?: boolean;
}

export const UltraFastProductCard: React.FC<UltraFastProductCardProps> = ({
  product,
  onAddToCart,
  priority = false,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const isNew = product.new_arrival_date && 
    new Date(product.new_arrival_date) > new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  
  const isOutOfStock = product.stock_quantity <= 0;
  const isInUserWishlist = user ? isInWishlist(product.id) : false;

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      toast({
        title: "Size Required",
        description: "Please select a size before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedColor && product.colors && product.colors.length > 0) {
      toast({
        title: "Color Required", 
        description: "Please select a color before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      
      // Show immediate feedback
      toast({
        title: "Adding to cart...",
        description: `${product.name} is being added to your cart`,
      });

      const size = selectedSize || (typeof product.sizes?.[0] === 'string' ? product.sizes[0] : product.sizes?.[0]?.name) || 'One Size';
      const color = selectedColor || (typeof product.colors?.[0] === 'string' ? product.colors[0] : product.colors?.[0]?.name) || 'Default';
      
      await onAddToCart(product, quantity, size, color);
      
      // Show success feedback
      toast({
        title: "Added to cart!",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to add items to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isInUserWishlist) {
        await removeFromWishlist(product.id);
        toast({
          title: "Removed from Wishlist",
          description: "Item removed from your wishlist.",
        });
      } else {
        await addToWishlist(product.id);
        toast({
          title: "Added to Wishlist",
          description: "Item added to your wishlist.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="group relative overflow-hidden border transition-all duration-200 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        <UltraFastImage
          src={product.thumbnail_image || (
            Array.isArray(product.images) 
              ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.image_url) 
              : null
          )}
          alt={product.name}
          className="w-full h-full"
          priority={priority}
        />
        
        {/* Action buttons overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/product/${product.id}`)}
            className="bg-white/90 hover:bg-white"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={toggleWishlist}
            className={`bg-white/90 hover:bg-white ${isInUserWishlist ? 'text-red-500' : ''}`}
          >
            <Heart className={`w-4 h-4 ${isInUserWishlist ? 'fill-current' : ''}`} />
          </Button>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && (
            <Badge variant="secondary" className="bg-green-500 text-white">
              New
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="destructive">
              Out of Stock
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-lg font-bold text-primary mb-3">
          {formatPrice(product.price)}
        </p>

        {/* Size selection */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-2">
            <label className="text-xs font-medium mb-1 block">Size:</label>
            <div className="flex flex-wrap gap-1">
              {product.sizes.slice(0, 4).map((size, index) => {
                const sizeName = typeof size === 'string' ? size : size.name;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedSize(sizeName)}
                    className={`px-2 py-1 text-xs border rounded ${
                      selectedSize === sizeName
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background'
                    }`}
                  >
                    {sizeName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Color selection */}
        {product.colors && product.colors.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium mb-1 block">Color:</label>
            <div className="flex flex-wrap gap-1">
              {product.colors.slice(0, 4).map((color, index) => {
                const colorName = typeof color === 'string' ? color : color.name;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(colorName)}
                    className={`px-2 py-1 text-xs border rounded ${
                      selectedColor === colorName
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background'
                    }`}
                  >
                    {colorName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAddingToCart}
          className={`w-full transition-all duration-200 ${isAddingToCart ? 'animate-pulse' : 'hover-scale'}`}
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </CardContent>
    </Card>
  );
};