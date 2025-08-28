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
import { getProductThumbnail, getProductSizes, getProductColors } from '@/components/ProductDisplayHelper';

const Wishlist = () => {
  const { user, loading } = useAuth();
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = usePersistentCart();
  const { formatPrice } = useCurrency();
  const [selectedItems, setSelectedItems] = useState<{[key: string]: {size: string, color: string}}>({});

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleAddToCart = async (item: any) => {
    const selection = selectedItems[item.id];
    if (!selection?.size || !selection?.color) {
      alert('Please select size and color first');
      return;
    }

    await addToCart(item.product, 1, selection.size, selection.color);
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

  const totalItems = 0; // Cart items count for header

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
                <img
                  src={getProductThumbnail(item.product)}
                  alt={item.product?.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(item.product?.price || 0)}
                      </p>
                      <Badge variant="secondary">{item.product?.category}</Badge>
                    </div>

                  <p className="text-sm text-muted-foreground">
                    {item.product?.description}
                  </p>

                  {/* Size Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Size</label>
                    <Select
                      value={selectedItems[item.id]?.size || ''}
                      onValueChange={(value) => updateSelection(item.id, 'size', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                       <SelectContent>
                         {getProductSizes(item.product).map(size => (
                           <SelectItem key={size} value={size}>
                             {size}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Color</label>
                    <Select
                      value={selectedItems[item.id]?.color || ''}
                      onValueChange={(value) => updateSelection(item.id, 'color', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                       <SelectContent>
                         {getProductColors(item.product).map(color => (
                           <SelectItem key={color} value={color}>
                             {color}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleAddToCart(item)}
                    disabled={!selectedItems[item.id]?.size || !selectedItems[item.id]?.color}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
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