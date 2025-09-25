import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Minus, Heart, ShoppingCart, AlertTriangle, Bell, Loader2, Ruler, Palette, RulerHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import Header from '@/components/Header';
import debounce from 'lodash/debounce';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
      if (hasRealSizes(product) && product.sizes?.length > 0 && !selectedSize) {
        const availableSize = product.sizes.find((s) => s.available);
        if (availableSize) setSelectedSize(getSizeName(availableSize));
      }
      if (hasRealColors(product) && product.colors?.length > 0 && !selectedColor) {
        const availableColor = product.colors.find((c) => c.available);
        if (availableColor) setSelectedColor(getColorName(availableColor));
      }
    }
  }, [product]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Product not found or unavailable",
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

    if (quantity > product.stock_quantity) {
      toast({
        title: "Stock Limit",
        description: `Only ${product.stock_quantity} items available`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingToCart(true);
      await addToCart(product, quantity, selectedSize || 'One Size', selectedColor || 'Default');
      toast({
        title: "Added to cart!",
        description: `${quantity} x ${product.name} has been added to your cart`,
      });
      openCart();
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
          return;
        }
        throw error;
      }

      toast({
        title: "Alert Set",
        description: `You'll be notified when "${product.name}" is back in stock`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set stock alert",
        variant: "destructive",
      });
    } finally {
      setIsSettingAlert(false);
      setIsStockAlertDialogOpen(false);
      setEmail('');
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
      <div className="min-h-screen bg-background">
        <Header cartItems={totalItems} onCartClick={openCart} />
        <div className="container mx-auto px-4 py-8">
          <BackButton className="mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="aspect-square rounded-lg h-[400px]" />
              <div className="grid grid-cols-4 gap-2">
                {Array(4).fill(0).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded h-20" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-8 rounded w-3/4" />
                <Skeleton className="h-4 rounded w-1/2" />
                <Skeleton className="h-6 rounded w-1/4" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 rounded w-1/4" />
                <div className="flex gap-2">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded w-16" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-12 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header cartItems={totalItems} onCartClick={openCart} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto" />
            <p className="text-xl text-muted-foreground">Product not found</p>
            <Button onClick={() => navigate('/')} variant="outline" size="lg" aria-label="Return to home">
              Return Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="min-h-screen bg-background">
      <Header cartItems={totalItems} onCartClick={openCart} />
      <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
        <BackButton className="mb-6 text-lg" aria-label="Go back to previous page" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted shadow-md hover:shadow-xl transition-shadow duration-300">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
                </div>
              )}
              <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                <DialogTrigger asChild>
                  <button className="w-full h-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <img
                      src={product.images[selectedImage]?.image_url || getPrimaryImage(product)}
                      alt={product.images[selectedImage]?.alt_text || `${product.name} - Main Image`}
                      className={cn(
                        'w-full h-full object-cover transition-transform duration-500 hover:scale-105',
                        isImageLoading ? 'opacity-0' : 'opacity-100'
                      )}
                      loading="eager"
                      onLoad={() => setIsImageLoading(false)}
                      onError={() => setIsImageLoading(false)}
                    />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] p-0 border-none">
                  <Carousel className="w-full h-full" setApi={(api) => api?.scrollTo(selectedImage)}>
                    <CarouselContent>
                      {product.images.map((image, index) => (
                        <CarouselItem key={image.id}>
                          <div className="flex items-center justify-center h-[80vh] p-4">
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
                    <CarouselPrevious className="left-4" aria-label="Previous image" />
                    <CarouselNext className="right-4" aria-label="Next image" />
                  </Carousel>
                </DialogContent>
              </Dialog>
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-3 md:gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedImage(index);
                      setIsImageLoading(true);
                    }}
                    className={cn(
                      'aspect-square overflow-hidden rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      selectedImage === index ? 'border-primary shadow-md' : 'border-transparent hover:border-primary/50 hover:shadow-sm'
                    )}
                    aria-label={`View thumbnail ${index + 1} of ${product.name}`}
                  >
                    <img
                      src={image.image_url}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                {product.name}
              </h1>
              <p className="text-xl text-muted-foreground uppercase tracking-wider">
                {product.category}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {formatPrice(product.price)}
                </p>
                {stockStatus && (
                  <Badge variant={stockStatus.variant} className="text-base px-3 py-1">
                    {stockStatus.status === 'out' && <AlertTriangle className="h-4 w-4 mr-1" aria-hidden="true" />}
                    {stockStatus.message}
                  </Badge>
                )}
              </div>
            </div>
            {product.description && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-foreground">Description</h3>
                <p className="text-lg text-muted-foreground leading-loose whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}
            {(product.show_jacket_size_chart || product.show_pants_size_chart) && (
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-foreground">Size Charts</h3>
                <div className="flex flex-wrap gap-4">
                  {product.show_jacket_size_chart && (
                    <Button
                      variant="outline"
                      onClick={() => window.open('/size-charts/jacket', '_blank')}
                      className="hover-scale transition-all duration-200"
                      aria-label="View jacket size chart"
                    >
                      <Ruler className="h-4 w-4 mr-2" aria-hidden="true" />
                      Jacket Size Chart
                    </Button>
                  )}
                  {product.show_pants_size_chart && (
                    <Button
                      variant="outline"
                      onClick={() => window.open('/size-charts/pants', '_blank')}
                      className="hover-scale transition-all duration-200"
                      aria-label="View pants size chart"
                    >
                      <RulerHorizontal className="h-4 w-4 mr-2" aria-hidden="true" />
                      Pants Size Chart
                    </Button>
                  )}
                </div>
              </div>
            )}
            {hasRealSizes(product) && (
              <div className="space-y-3">
                <Label htmlFor="size-select" className="text-xl font-semibold text-foreground">
                  Size
                </Label>
                <div id="size-select" className="flex flex-wrap gap-3">
                  {product.sizes!.map((size) => (
                    <Button
                      key={size.id}
                      variant={selectedSize === getSizeName(size) ? 'default' : 'outline'}
                      onClick={() => setSelectedSize(getSizeName(size))}
                      className="text-base px-6 py-3 min-w-[4rem] transition-transform duration-200 hover:scale-105 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!size.available}
                      aria-pressed={selectedSize === getSizeName(size)}
                      aria-label={`Select size ${getSizeName(size)}${!size.available ? ' (unavailable)' : ''}`}
                    >
                      {getSizeName(size)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {hasRealColors(product) && (
              <div className="space-y-3">
                <Label htmlFor="color-select" className="text-xl font-semibold text-foreground">
                  Color
                </Label>
                <div id="color-select" className="flex flex-wrap gap-3">
                  {product.colors!.map((color) => (
                    <Button
                      key={color.id}
                      variant={selectedColor === getColorName(color) ? 'default' : 'outline'}
                      onClick={() => setSelectedColor(getColorName(color))}
                      className="text-base px-6 py-3 capitalize transition-transform duration-200 hover:scale-105 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!color.available}
                      aria-pressed={selectedColor === getColorName(color)}
                      aria-label={`Select color ${getColorName(color)}${!color.available ? ' (unavailable)' : ''}`}
                      style={{
                        backgroundColor: selectedColor === getColorName(color) ? color.hex : 'transparent',
                        borderColor: color.hex,
                      }}
                    >
                      {getColorName(color)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <Label htmlFor="quantity-select" className="text-xl font-semibold text-foreground">
                Quantity
              </Label>
              <div id="quantity-select" className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={product.stock_quantity === 0 || isAddingToCart || quantity === 1}
                  className="transition-transform duration-200 hover:scale-105 focus:scale-105"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="text-2xl font-medium w-16 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={product.stock_quantity === 0 || isAddingToCart || quantity >= product.stock_quantity}
                  className="transition-transform duration-200 hover:scale-105 focus:scale-105"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <Button
                onClick={handleAddToCart}
                className="w-full text-lg py-6 font-semibold transition-all duration-300 hover:scale-105 focus:scale-105 disabled:opacity-50"
                size="lg"
                disabled={product.stock_quantity === 0 || isAddingToCart}
                aria-label={product.stock_quantity === 0 ? 'Out of stock' : 'Add to cart'}
              >
                <ShoppingCart className="h-5 w-5 mr-3" aria-hidden="true" />
                {isAddingToCart ? 'Adding...' : product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3">
                {user && (
                  <Button
                    variant="outline"
                    onClick={handleWishlistToggle}
                    className="flex-1 text-lg py-6 transition-all duration-300 hover:scale-105 focus:scale-105"
                    disabled={isAddingToWishlist}
                    aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart
                      className={cn(
                        'h-5 w-5 mr-3',
                        isInWishlist(product.id) ? 'fill-current text-red-500' : ''
                      )}
                      aria-hidden="true"
                    />
                    {isAddingToWishlist
                      ? 'Updating...'
                      : isInWishlist(product.id)
                      ? 'In Wishlist'
                      : 'Add to Wishlist'}
                  </Button>
                )}
                {product.stock_quantity === 0 && (
                  <Dialog open={isStockAlertDialogOpen} onOpenChange={setIsStockAlertDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 text-lg py-6 transition-all duration-300 hover:scale-105 focus:scale-105"
                        aria-label="Notify when available"
                      >
                        <Bell className="h-5 w-5 mr-3" aria-hidden="true" />
                        Notify When Available
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-xl">
                      <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl">Stock Alert</DialogTitle>
                        <DialogDescription className="text-lg">
                          We'll email you when "{product.name}" is back in stock.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="email" className="text-base">
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSettingAlert}
                            className="mt-1 text-base py-6"
                            required
                          />
                        </div>
                        <Button
                          onClick={handleStockAlert}
                          className="w-full text-lg py-6 transition-all duration-300 hover:scale-105 focus:scale-105"
                          disabled={isSettingAlert || !email}
                          aria-label="Set stock alert"
                        >
                          {isSettingAlert ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-3 animate-spin" aria-hidden="true" />
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
