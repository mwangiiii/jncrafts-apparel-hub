import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useWishlist } from '@/hooks/useWishlist';
import { usePersistentCart } from '@/hooks/usePersistentCart';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import { getPrimaryImage, hasRealSizes, hasRealColors, getSizeName, getColorName } from '@/components/ProductDisplayHelper';
import { useToast } from '@/hooks/use-toast';

const Wishlist = () => {
  const { user, loading } = useAuth();
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart, cartItems } = usePersistentCart();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<{[key: string]: {size: string, color: string}}>({});
  const [addingToCart, setAddingToCart] = useState<{[key: string]: boolean}>({});

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleAddToCart = async (item: any) => {
    const product = item.product;
    if (!product) return;

    // Prevent multiple clicks
    if (addingToCart[item.id]) return;

    const selection = selectedItems[item.id];
    const requiresSize = hasRealSizes(product);
    const requiresColor = hasRealColors(product);

    if (requiresSize && !selection?.size) {
      toast({
        title: "Size Required",
        description: "Please select a size before adding to cart",
        variant: "destructive"
      });
      return;
    }

    if (requiresColor && !selection?.color) {
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

    // Set loading state
    setAddingToCart(prev => ({ ...prev, [item.id]: true }));

    try {
      await addToCart(product, 1, selection?.size || '', selection?.color || '');
      
      // Show success message
      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart`,
      });

      // Clear selection after successful add
      setSelectedItems(prev => {
        const newState = { ...prev };
        delete newState[item.id];
        return newState;
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Remove loading state
      setAddingToCart(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const updateSelection = (itemId: string, type: 'size' | 'color', value: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: value
      }
    }));
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        cartItems={totalItems} 
        onCartClick={() => {}} 
      />
      <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">My Wishlist</h1>
        <Badge variant="secondary">{wishlistItems.length} items</Badge>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6">Add items you love to your wishlist</p>
          <Button onClick={() => window.location.href = '/#products'}>
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.product?.name}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeFromWishlist(item.product_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-48 bg-muted/50 rounded-lg mb-4 overflow-hidden">
                  <img
                    src={getPrimaryImage(item.product) || '/placeholder.svg'}
                    alt={item.product?.name || 'Product image'}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {formatPrice(item.product?.price || 0)}
                      </p>
                      <Badge variant="secondary" className="uppercase text-xs tracking-wide">{item.product?.category}</Badge>
                    </div>

                  {item.product?.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {item.product.description}
                    </p>
                  )}

                  {/* Size Selection */}
                  {hasRealSizes(item.product) && (
                    <div>
                      <label className="text-sm font-medium mb-2 block text-foreground">Size</label>
                      <Select
                        value={selectedItems[item.id]?.size || ''}
                        onValueChange={(value) => updateSelection(item.id, 'size', value)}
                      >
                        <SelectTrigger className="bg-background border-border hover:border-primary focus:border-primary">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                         <SelectContent className="bg-background border border-border shadow-lg z-50">
                           {item.product.sizes?.map((size, index) => (
                             <SelectItem key={`${getSizeName(size)}-${index}`} value={getSizeName(size)} className="cursor-pointer hover:bg-muted">
                               {getSizeName(size)}
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Color Selection */}
                  {hasRealColors(item.product) && (
                    <div>
                      <label className="text-sm font-medium mb-2 block text-foreground">Color</label>
                      <Select
                        value={selectedItems[item.id]?.color || ''}
                        onValueChange={(value) => updateSelection(item.id, 'color', value)}
                      >
                        <SelectTrigger className="bg-background border-border hover:border-primary focus:border-primary">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                         <SelectContent className="bg-background border border-border shadow-lg z-50">
                           {item.product.colors?.map((color, index) => (
                             <SelectItem key={`${getColorName(color)}-${index}`} value={getColorName(color)} className="cursor-pointer hover:bg-muted capitalize">
                               {getColorName(color)}
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-elegant disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleAddToCart(item)}
                    disabled={
                      addingToCart[item.id] ||
                      item.product?.stock_quantity === 0 || 
                      (hasRealSizes(item.product) && !selectedItems[item.id]?.size) ||
                      (hasRealColors(item.product) && !selectedItems[item.id]?.color)
                    }
                  >
                    {addingToCart[item.id] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {item.product?.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </div>
  );
};

export default Wishlist;