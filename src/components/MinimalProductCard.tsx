import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { UltraFastImage } from './UltraFastImage';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/database';

interface MinimalProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, size: string, color: string) => void;
  priority?: boolean;
}

export const MinimalProductCard: React.FC<MinimalProductCardProps> = ({
  product,
  onAddToCart,
  priority = false,
}) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();

  const isNew = product.new_arrival_date && 
    new Date(product.new_arrival_date) > new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  
  const isOutOfStock = product.stock_quantity <= 0;

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    
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
      
      // For products with variants, redirect to product page
      if (product.has_colors || product.has_sizes) {
        navigate(`/product/${product.id}`);
        return;
      }
      
      // Show immediate feedback
      toast({
        title: "Adding to cart...",
        description: `${product.name} is being added to your cart`,
      });

      await onAddToCart(product, 1, 'One Size', 'Default');
      
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

        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAddingToCart}
          className={`w-full transition-all duration-200 ${isAddingToCart ? 'animate-pulse' : 'hover-scale'}`}
          size="sm"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 
           (product.has_colors || product.has_sizes) ? 'Select Options' : 'Add to Cart'}
        </Button>
      </CardContent>
    </Card>
  );
};