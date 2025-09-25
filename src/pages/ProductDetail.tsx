import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Minus, Heart, ShoppingCart, AlertTriangle, Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import debounce from 'lodash/debounce';

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
    totalItems,
  } = useLazyCart();

  const { data: product, isLoading, error } = useProductDetail(id || '', !!id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [isStockAlertDialogOpen, setIsStockAlertDialogOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isSettingAlert, setIsSettingAlert] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    if (product) {
      if (product.sizes?.length > 0 && !selectedSize) {
        setSelectedSize(getSizeName(product.sizes[0]));
      }
      if (product.colors?.length > 0 && !selectedColor) {
        setSelectedColor(getColorName(product.colors[0]));
      }
    }
  }, [product, selectedSize, selectedColor]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Product not found or unavailable",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [error, navigate, toast]);

  const handleAddToCart = debounce(async () => {
    if (!product || isAddingToCart) return;

    if (hasRealSizes(product) && !selectedSize) {
      toast({
        title: "Size Required",
        description: "Please select a size before adding to cart",
        variant: "destructive",
      });
      return;
    }

    if (hasRealColors(product) && !selectedColor) {
      toast({
        title: "Color Required",
        description: "Please select a color before adding to cart",
        variant: "destructive",
      });
      return;
    }

    if (product.stock_quantity === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      toast({
        title: "Adding to cart...",
        description: `${product.name} is being added to your cart`,
      });

      await addToCart(product, quantity, selectedSize || 'One Size', selectedColor || 'Default');

      toast({
        title: "Added to cart!",
        description: `${quantity} x ${product.name} has been added to your cart`,
      });
      setTimeout(() => openCart(), 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  }, 300);

  const handleWishlistToggle = debounce(async () => {
    if (!product || isAddingToWishlist) return;

    try {
      setIsAddingToWishlist(true);
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
        toast({
          title: "Removed from Wishlist",
          description: `${product.name} has been removed from your wishlist`,
        });
      } else {
        await addToWishlist(product.id);
        toast({
          title: "Added to Wishlist",
          description: `${product.name} has been added to your wishlist`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  }, 300);

  const handleStockAlert = debounce(async () => {
    if (!email || !product || isSettingAlert) return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to set stock alerts",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSettingAlert(true);
      const emailHash = btoa(email.toLowerCase().trim());

      const { error } = await supabase
        .from('stock_alerts')
        .insert({
          user_id: user.id,
          product_id: product.id,
          email_hash: emailHash,
        });

      if (error) {
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
        description: `You'll be notified when "${product.name}" is back in stock`,
      });
      setIsStockAlertDialogOpen(false);
      setEmail('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to set stock alert",
        variant: "destructive",
      });
    } finally {
      setIsSettingAlert(false);
    }
  }, 300);

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
        <Header cartItems={totalItems} onCartClick={openCart} />
        <div className="container mx-auto px-4 py-8">
          <BackButton className="mb-6 animate-slide-in-right" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg h-[400px]" />
              <div className="grid grid-cols-4 gap-2">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded h-20" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded w-1/4" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="flex gap-2">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded w-16" />
                  ))}
                </div>
              </div>
              <div className="h-12 bg-muted rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background animate-fade-in">
        <Header cartItems={totalItems} onCartClick={openCart} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4 animate-scale-in">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto" />
            <div className="text-muted-foreground">Product not found</div>
            <Button onClick={() => navigate('/')} variant="outline" aria-label="Return to home">
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
      <Header cartItems={totalItems} onCartClick={openCart} />
      <div className="container mx-auto px-4 py-8">
        <BackButton className="mb-6 animate-slide-in-right" aria-label="Go back" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-scale-in">
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-muted shadow-elegant hover:shadow-glow transition-all duration-500">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                <DialogTrigger asChild>
                  <img
                    src={getPrimaryImage(product)}
                    alt={product.name}
                    className={`w-full h-full object-cover cursor-zoom-in hover:scale-110 transition-all duration-500 ease-out ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => setIsImageLoading(false)}
                  />
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                  <Carousel className="w-full" setApi={(api) => api?.scrollTo(selectedImage)}>
                    <CarouselContent>
                      {product.images.map((image, index) => (
                        <CarouselItem key={image.id}>
                          <div className="aspect-square flex items-center justify-center p-6">
                            <img
                              src={image.image_url}
                              alt={image.alt_text || `${product.name} - Image ${index + 1}`}
                              className="max-w-full max-h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious aria-label="Previous image" />
                    <CarouselNext aria-label="Next image" />
                  </Carousel>
                </DialogContent>
              </Dialog>
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-2 animate-fade-in">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedImage(index);
                      setIsImageLoading(true);
                    }}
                    className={`aspect-square overflow-hidden rounded border-2 transition-all duration-300 hover:scale-105 ${
                      selectedImage === index ? 'border-primary shadow-glow' : 'border-transparent hover:border-muted-foreground'
                    }`}
                    aria-label={`Select image ${index + 1}`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || `${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover transition-all duration-300"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
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
            {hasRealSizes(product) && (
              <div className="animate-fade-in">
                <Label className="text-base font-semibold text-foreground">Size</Label>
                <div className="flex gap-2 mt-2">
                  {product.sizes!.map((size) => (
                    <Button
                      key={size.id}
                      variant={selectedSize === getSizeName(size) ? 'default' : 'outline'}
                      onClick={() => setSelectedSize(getSizeName(size))}
                      className="min-w-[3rem] hover-scale transition-all duration-200"
                      disabled={!size.available}
                      aria-label={`Select size ${getSizeName(size)}`}
                    >
                      {getSizeName(size)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {hasRealColors(product) && (
              <div className="animate-fade-in">
                <Label className="text-base font-semibold text-foreground">Color</Label>
                <div className="flex gap-2 mt-2">
                  {product.colors!.map((color) => (
                    <Button
                      key={color.id}
                      variant={selectedColor === getColorName(color) ? 'default' : 'outline'}
                      onClick={() => setSelectedColor(getColorName(color))}
                      className="capitalize hover-scale transition-all duration-200"
                      disabled={!color.available}
                      aria-label={`Select color ${getColorName(color)}`}
                      style={{ backgroundColor: selectedColor === getColorName(color) ? color.hex : 'transparent' }}
                    >
                      {getColorName(color)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="animate-fade-in">
              <Label className="text-base font-semibold text-foreground">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={product.stock_quantity === 0 || isAddingToCart}
                  className="hover-scale transition-all duration-200"
                  aria-label="Decrease quantity"
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
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3 animate-slide-in-right">
              <Button
                onClick={handleAddToCart}
                className={`w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-105 ${isAddingToCart ? 'animate-pulse' : ''}`}
                size="lg"
                disabled={product.stock_quantity === 0 || isAddingToCart}
                aria-label="Add to cart"
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
                    disabled={isAddingToWishlist}
                    aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart
                      className={`h-4 w-4 mr-2 transition-all duration-200 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    {isAddingToWishlist
                      ? 'Updating...'
                      : isInWishlist(product.id)
                      ? 'Remove from Wishlist'
                      : 'Add to Wishlist'}
                  </Button>
                )}
                {product.stock_quantity === 0 && (
                  <Dialog open={isStockAlertDialogOpen} onOpenChange={setIsStockAlertDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 hover-scale transition-all duration-200"
                        aria-label="Notify when available"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Notify When Available
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Stock Alert</DialogTitle>
                        <DialogDescription>
                          We'll email you when "{product.name}" is back in stock.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSettingAlert}
                            aria-required="true"
                          />
                        </div>
                        <Button
                          onClick={handleStockAlert}
                          className="w-full hover-scale transition-all duration-200"
                          disabled={isSettingAlert || !email}
                          aria-label="Set stock alert"
                        >
                          {isSettingAlert ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Setting Alert...
                            </>
                          ) : (
                            'Set Alert'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
        </div>
        {product.videos?.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <ProductVideoPlayer videos={product.videos} productName={product.name} />
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