import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Minus, Heart, ShoppingCart, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { getPrimaryImage, hasRealSizes, hasRealColors, getSizeName, getColorName } from '@/components/ProductDisplayHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLazyCart } from '@/hooks/useLazyCart';
import { useProductDetail } from '@/hooks/useProductDetail';
import BackButton from '@/components/BackButton';
import Cart from '@/components/Cart';

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ProductVideoPlayer from '@/components/admin/ProductVideoPlayer';
import Header from '@/components/Header';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const {
    addToCart,
    cartItems,
    updateQuantity,
    removeItem,
    clearCart,
    isCartOpen,
    openCart,
    closeCart,
    totalItems
  } = useLazyCart();

  // Use the optimized product detail hook
  const { data: product, isLoading, error } = useProductDetail(id || '', !!id);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isStockAlertDialogOpen, setIsStockAlertDialogOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Set initial selections when product loads
  React.useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0 && !selectedSize) {
        setSelectedSize(getSizeName(product.sizes[0]));
      }
      if (product.colors && product.colors.length > 0 && !selectedColor) {
        setSelectedColor(getColorName(product.colors[0]));
      }
    }
  }, [product, selectedSize, selectedColor]);

  // Handle error state
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [error, navigate, toast]);

  const handleAddToCart = async () => {
    if (!product || isAddingToCart) return;
    
    if (hasRealSizes(product) && !selectedSize) {
      toast({
        title: "Size Required",
        description: "Please select a size before adding to cart",
        variant: "destructive"
      });
      return;
    }
    
    if (hasRealColors(product) && !selectedColor) {
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

    try {
      setIsAddingToCart(true);
      
      // Show immediate feedback
      toast({
        title: "Adding to cart...",
        description: `${product.name} is being added to your cart`,
      });

      await addToCart(product, quantity, selectedSize || 'One Size', selectedColor || 'Default');
      
      // Show success feedback and open cart
      toast({
        title: "Added to cart!",
        description: `${product.name} has been added to your cart`,
      });
      
      // Optionally open the cart to show the item was added
      setTimeout(() => {
        openCart();
      }, 500);
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

  const handleWishlistToggle = () => {
    if (!product) return;
    
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  const handleStockAlert = async () => {
    if (!email || !product) return;

    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to set stock alerts",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create stock alert directly to avoid RPC issues
      // Use a simple hash of the email for now
      const emailHash = btoa(email.toLowerCase().trim()); // Simple base64 encoding
      
      const { error } = await supabase
        .from('stock_alerts')
        .insert({
          user_id: user.id,
          product_id: product.id,
          email_hash: emailHash
        });

      if (error) {
        // Handle duplicate constraint error gracefully
        if (error.code === '23505') {
          toast({
            title: "Alert Already Set",
            description: "You already have an alert set for this product",
          });
          setIsStockAlertDialogOpen(false);
          setEmail('');
          return;
        }
        throw error;
      }

      toast({
        title: "Alert Set",
        description: "You'll be notified when this item is back in stock",
      });
      setIsStockAlertDialogOpen(false);
      setEmail('');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        toast({
          title: "Already Subscribed",
          description: "You're already subscribed to alerts for this product",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error", 
          description: "Failed to set stock alert",
          variant: "destructive"
        });
      }
    }
  };

  const getStockStatus = () => {
    if (!product) return null;
    
    if (product.stock_quantity === 0) {
      return { status: 'out', message: 'Out of Stock', variant: 'destructive' as const };
    } else if (product.stock_quantity <= 5) {
      return { status: 'low', message: `Only ${product.stock_quantity} left in stock`, variant: 'secondary' as const };
    }
    return { status: 'in', message: 'In Stock', variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <Header 
          cartItems={totalItems} 
          onCartClick={openCart} 
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4 animate-scale-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div className="text-muted-foreground">Loading product...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <Header 
          cartItems={totalItems} 
          onCartClick={openCart} 
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4 animate-scale-in">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto" />
            <div className="text-muted-foreground">Product not found</div>
            <Button onClick={() => navigate('/')} variant="outline">
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="min-h-screen bg-background animate-fade-in">
        <Header 
          cartItems={totalItems} 
          onCartClick={openCart} 
        />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <BackButton className="mb-6 animate-slide-in-right" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-scale-in">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square overflow-hidden rounded-lg bg-muted shadow-elegant hover:shadow-glow transition-all duration-500">
              <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                <DialogTrigger asChild>
                  <img
                     src={getPrimaryImage(product)}
                     alt={product.name}
                     className="w-full h-full object-cover cursor-zoom-in hover:scale-110 transition-all duration-500 ease-out"
                  />
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                  <div className="relative bg-background/80 backdrop-blur-sm">
                    <Carousel className="w-full">
                      <CarouselContent>
                         {product.images.map((image, index) => (
                           <CarouselItem key={index}>
                             <div className="aspect-square flex items-center justify-center p-6">
                               <img
                                 src={getPrimaryImage({ images: [image] } as Product)}
                                 alt={`${product.name} - Image ${index + 1}`}
                                 className="max-w-full max-h-full object-contain"
                               />
                             </div>
                           </CarouselItem>
                         ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 animate-fade-in">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded border-2 transition-all duration-300 hover:scale-105 ${
                      selectedImage === index 
                        ? 'border-primary shadow-glow' 
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                  >
                     <img
                       src={getPrimaryImage({ images: [image] } as Product)}
                       alt={`${product.name} thumbnail ${index + 1}`}
                       className="w-full h-full object-cover transition-all duration-300"
                     />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6 animate-slide-in-right">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-fade-in">
                {product.name}
              </h1>
              <p className="text-lg text-muted-foreground uppercase tracking-wide animate-fade-in">
                {product.category}
              </p>
              <div className="flex items-center gap-3 animate-scale-in">
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {formatPrice(product.price)}
                </p>
                {stockStatus && (
                  <Badge variant={stockStatus.variant} className="flex items-center gap-1 animate-fade-in">
                    {stockStatus.status === 'out' && <AlertTriangle className="h-3 w-3" />}
                    {stockStatus.message}
                  </Badge>
                )}
              </div>
            </div>

            {product.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Size Selection */}
            {hasRealSizes(product) && (
              <div className="animate-fade-in">
                <Label className="text-base font-semibold text-foreground">Size</Label>
                <div className="flex gap-2 mt-2">
                  {product.sizes!.map((size) => (
                    <Button
                      key={getSizeName(size)}
                      variant={selectedSize === getSizeName(size) ? "default" : "outline"}
                      onClick={() => setSelectedSize(getSizeName(size))}
                      className="min-w-[3rem] hover-scale transition-all duration-200"
                    >
                      {getSizeName(size)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {hasRealColors(product) && (
              <div className="animate-fade-in">
                <Label className="text-base font-semibold text-foreground">Color</Label>
                <div className="flex gap-2 mt-2">
                  {product.colors!.map((color) => (
                    <Button
                      key={getColorName(color)}
                      variant={selectedColor === getColorName(color) ? "default" : "outline"}
                      onClick={() => setSelectedColor(getColorName(color))}
                      className="capitalize hover-scale transition-all duration-200"
                    >
                      {getColorName(color)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="animate-fade-in">
              <Label className="text-base font-semibold text-foreground">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={product.stock_quantity === 0 || isAddingToCart}
                  className="hover-scale transition-all duration-200"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium w-12 text-center animate-scale-in">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={product.stock_quantity === 0 || isAddingToCart}
                  className="hover-scale transition-all duration-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 animate-slide-in-right">
              <Button 
                onClick={handleAddToCart}
                className={`w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 ${isAddingToCart ? 'animate-pulse' : ''}`}
                size="lg"
                disabled={product.stock_quantity === 0 || isAddingToCart}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {isAddingToCart ? 'Adding...' : product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>

              <div className="flex gap-2">
                {user && (
                  <Button
                    variant="outline"
                    onClick={handleWishlistToggle}
                    className="flex-1 hover-scale transition-all duration-200"
                  >
                    <Heart 
                      className={`h-4 w-4 mr-2 transition-all duration-200 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} 
                    />
                    {isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  </Button>
                )}

                {product.stock_quantity === 0 && (
                  <Dialog open={isStockAlertDialogOpen} onOpenChange={setIsStockAlertDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 hover-scale transition-all duration-200">
                        <Bell className="h-4 w-4 mr-2" />
                        Notify When Available
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">Stock Alert</h3>
                          <p className="text-muted-foreground">
                            We'll email you when this product is back in stock.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleStockAlert} className="w-full hover-scale transition-all duration-200">
                          Set Alert
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Videos */}
        {product.videos && product.videos.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <ProductVideoPlayer 
              videos={product.videos} 
              productName={product.name}
            />
          </div>
        )}

      </div>
      
      <Cart
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />
    </div>
  );
};

export default ProductDetail;