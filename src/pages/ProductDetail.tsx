  import React, { useState, useEffect, useCallback } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import { useQueryClient } from '@tanstack/react-query';
  import { Plus, Minus, Heart, ShoppingCart, AlertTriangle, Bell, Loader2, Ruler } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { Badge } from '@/components/ui/badge';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Separator } from '@/components/ui/separator';
  import { useToast } from '@/hooks/use-toast';
  import { supabase } from '@/integrations/supabase/client';
  import { Product } from '@/types/database';
  import { getPrimaryImage, hasRealSizes, hasRealColors, getSizeName, getColorName } from '@/components/ProductDisplayHelper';
  import { useAuth } from '@/contexts/AuthContext';
  import { useWishlist } from '@/hooks/useWishlist';
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
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
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
    const { data: product, isLoading, error, isError } = useProductDetail(id || '', !!id);

    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<Product['variants'][0] | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [email, setEmail] = useState(user?.email || '');
    const [isStockAlertDialogOpen, setIsStockAlertDialogOpen] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
    const [isSettingAlert, setIsSettingAlert] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState<string[]>([]);

    console.log('[ProductDetail] Product:', product);
    console.log('[ProductDetail] isLoading:', isLoading, 'isError:', isError, 'error:', error);

    const formatPrice = (price: number | undefined | null, additionalPrice: number = 0) => {
      const totalPrice = (typeof price === 'number' && !isNaN(price) ? price : 0) + additionalPrice;
      return `KSh${totalPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
    };

    useEffect(() => {
      queryClient.removeQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    }, [id, queryClient]);

    useEffect(() => {
      if (product) {
        if (hasRealSizes(product) && product.sizes?.length > 0 && !selectedSize) {
          const availableSize = product.sizes.find((s) => s.is_active && product.variants.some((v) => v.size_id === s.id && v.is_available && v.stock_quantity > 0));
          if (availableSize) setSelectedSize(getSizeName(availableSize));
        }
        if (hasRealColors(product) && product.colors?.length > 0 && !selectedColor) {
          const availableColor = product.colors.find((c) => c.is_active && product.variants.some((v) => v.color_id === c.id && v.is_available && v.stock_quantity > 0));
          if (availableColor) setSelectedColor(getColorName(availableColor));
        }
      }
    }, [product]);

    useEffect(() => {
      if (isError && error) {
        toast({
          title: 'Error',
          description: error.message || 'Product not found or unavailable',
          variant: 'destructive',
        });
        navigate('/');
      }
    }, [isError, error, navigate, toast]);

    useEffect(() => {
      if (product) {
        const colorId = selectedColor ? product.colors?.find((c) => getColorName(c) === selectedColor)?.id : null;
        const sizeId = selectedSize ? product.sizes?.find((s) => getSizeName(s) === selectedSize)?.id : null;
        const variant = product.variants?.find(
          (v) =>
            v.color_id === colorId &&
            v.size_id === sizeId &&
            v.is_available
        );
        setSelectedVariant(variant || null);
        setQuantity(1);
      }
    }, [selectedColor, selectedSize, product]);

    const handleAddToCart = useCallback(
      debounce(async () => {
        if (!product || isAddingToCart) return;

        if (hasRealSizes(product) && !selectedSize) {
          toast({
            title: 'Size Required',
            description: 'Please select a size before adding to cart',
            variant: 'destructive',
          });
          return;
        }

        if (hasRealColors(product) && !selectedColor) {
          toast({
            title: 'Color Required',
            description: 'Please select a color before adding to cart',
            variant: 'destructive',
          });
          return;
        }

        let stockQuantity = 0;
        let variantId: string | undefined = undefined;

        if (product.variants?.length > 0) {
          if (!selectedVariant || selectedVariant.stock_quantity === 0) {
            toast({
              title: 'Out of Stock',
              description: 'This variant is currently out of stock',
              variant: 'destructive',
            });
            return;
          }
          stockQuantity = selectedVariant.stock_quantity;
          variantId = selectedVariant.id;
        } else {
          if (product.stock_quantity === 0) {
            toast({
              title: 'Out of Stock',
              description: 'This product is currently out of stock',
              variant: 'destructive',
            });
            return;
          }
          stockQuantity = product.stock_quantity;
        }

        if (quantity > stockQuantity) {
          toast({
            title: 'Stock Limit',
            description: `Only ${stockQuantity} items available`,
            variant: 'destructive',
          });
          return;
        }

        try {
          setIsAddingToCart(true);
          await addToCart(product, quantity, selectedSize || 'One Size', selectedColor || 'Default', variantId);
          toast({
            title: 'Added to Cart!',
            description: `${quantity} x ${product.name} (${selectedColor || 'Default'}, ${selectedSize || 'One Size'}) added to your cart`,
          });
          openCart();
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to add item to cart. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsAddingToCart(false);
        }
      }, 300),
      [product, selectedSize, selectedColor, selectedVariant, quantity, addToCart, toast, openCart]
    );

    const handleWishlistToggle = useCallback(
      debounce(async () => {
        if (!product || isAddingToWishlist) return;

        try {
          setIsAddingToWishlist(true);
          if (isInWishlist(product.id)) {
            await removeFromWishlist(product.id);
            toast({
              title: 'Removed from Wishlist',
              description: `${product.name} removed from your wishlist`,
            });
          } else {
            await addToWishlist(product.id);
            toast({
              title: 'Added to Wishlist',
              description: `${product.name} added to your wishlist`,
            });
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to update wishlist. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsAddingToWishlist(false);
        }
      }, 300),
      [product, isInWishlist, addToWishlist, removeFromWishlist, toast]
    );

    const handleStockAlert = useCallback(
      debounce(async () => {
        if (!email || !product || isSettingAlert) return;

        if (!user) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to set stock alerts',
            variant: 'destructive',
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
              variant_id: selectedVariant?.id || null,
            });

          if (error) {
            if (error.code === '23505') {
              toast({
                title: 'Alert Already Set',
                description: 'You already have an alert set for this variant',
              });
              return;
            }
            throw error;
          }

          toast({
            title: 'Alert Set',
            description: `You'll be notified when "${product.name} (${selectedColor || 'Default'}, ${selectedSize || 'One Size'})" is back in stock`,
          });
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to set stock alert',
            variant: 'destructive',
          });
        } finally {
          setIsSettingAlert(false);
          setIsStockAlertDialogOpen(false);
          setEmail('');
        }
      }, 300),
      [email, product, user, selectedVariant, selectedColor, selectedSize, toast]
    );

    const getStockStatus = () => {
      if (product?.variants?.length === 0) {
        // No variants
        if (product.stock_quantity === 0) {
          return { status: 'out', message: 'Out of Stock', variant: 'destructive' as const };
        } else if (product.stock_quantity <= 5) {
          return { status: 'low', message: `Only ${product.stock_quantity} left`, variant: 'warning' as const };
        }
        return { status: 'in', message: 'In Stock', variant: 'default' as const };
      }

      // Has variants
      if (selectedVariant) {
        if (selectedVariant.stock_quantity === 0) {
          return { status: 'out', message: 'Out of Stock', variant: 'destructive' as const };
        } else if (selectedVariant.stock_quantity <= 5) {
          return { status: 'low', message: `Only ${selectedVariant.stock_quantity} left`, variant: 'warning' as const };
        }
        return { status: 'in', message: 'In Stock', variant: 'default' as const };
      } else {
        // No variant selected
        const parts: string[] = [];
        if (hasRealSizes(product) && !selectedSize) parts.push('size');
        if (hasRealColors(product) && !selectedColor) parts.push('color');
        let message = parts.length > 0 ? `Select a ${parts.join(' and ')}` : 'Out of Stock';

        const hasAvailableVariants = product.variants.some((v) => v.is_available && v.stock_quantity > 0);
        if (hasAvailableVariants) {
          return { status: 'select', message, variant: 'destructive' as const };
        } else {
          return { status: 'out', message: 'Out of Stock', variant: 'destructive' as const };
        }
      }
    };

    const getDisplayedStock = () => {
      if (product?.variants?.length === 0) {
        return product.stock_quantity;
      }
      if (selectedVariant) {
        return selectedVariant.stock_quantity;
      }
      return product.variants.reduce((sum, v) => sum + (v.is_available && v.stock_quantity > 0 ? v.stock_quantity : 0), 0);
    };

    const handleImageError = (index: number, url: string) => {
      setImageErrors((prev) => [...prev, url]);
      setIsImageLoading(false);
    };

    // Helper function to get distinct available sizes
    const getDistinctAvailableSizes = () => {
      if (!product?.sizes || !product?.variants) return [];
      
      // Get all available variants
      const availableVariants = product.variants.filter(v => 
        v.is_available && 
        v.stock_quantity > 0 &&
        (!selectedColor || v.color_id === product.colors?.find(c => getColorName(c) === selectedColor)?.id)
      );

      // Get sizes that have available variants
      const availableSizes = product.sizes.filter(size => 
        size.is_active && 
        availableVariants.some(v => v.size_id === size.id)
      );

      // Create a Map to ensure uniqueness by size name (case-insensitive)
      const uniqueSizesMap = new Map();
      availableSizes.forEach(size => {
        const sizeName = getSizeName(size);
        const key = sizeName.toLowerCase();
        if (!uniqueSizesMap.has(key)) {
          uniqueSizesMap.set(key, size);
        }
      });

      return Array.from(uniqueSizesMap.values());
    };

    // Helper function to get distinct available colors
    const getDistinctAvailableColors = () => {
      if (!product?.colors || !product?.variants) return [];
      
      // Get all available variants
      const availableVariants = product.variants.filter(v => 
        v.is_available && 
        v.stock_quantity > 0 &&
        (!selectedSize || v.size_id === product.sizes?.find(s => getSizeName(s) === selectedSize)?.id)
      );

      // Get colors that have available variants
      const availableColors = product.colors.filter(color => 
        color.is_active && 
        availableVariants.some(v => v.color_id === color.id)
      );

      // Create a Map to ensure uniqueness by color name (case-insensitive)
      const uniqueColorsMap = new Map();
      availableColors.forEach(color => {
        const colorName = getColorName(color);
        const key = colorName.toLowerCase();
        if (!uniqueColorsMap.has(key)) {
          uniqueColorsMap.set(key, color);
        }
      });

      return Array.from(uniqueColorsMap.values());
    };

    // Get distinct available sizes and colors
    const distinctAvailableSizes = getDistinctAvailableSizes();
    const distinctAvailableColors = getDistinctAvailableColors();

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
          <Header cartItems={totalItems} onCartClick={openCart} />
          <div className="container mx-auto px-4 py-8">
            <BackButton className="mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Skeleton className="aspect-[4/3] rounded-lg h-[400px]" />
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
                <Skeleton className="h-12 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isError || !product || !product.id || !product.name) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
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
    const validImages = product.images
      .filter((img) => !imageErrors.includes(img.image_url) && img.is_active)
      .filter((img) =>
        selectedVariant && img.variant_id
          ? img.variant_id === selectedVariant.id
          : !img.variant_id || img.is_primary
      );
    const displayedStock = getDisplayedStock();
    const hasVariants = product.variants?.length > 0;
    const isSelectionComplete = hasVariants ? !!selectedVariant : true;
    const maxStock = isSelectionComplete ? (hasVariants ? selectedVariant!.stock_quantity : product.stock_quantity) : 0;
    const hasAvailableVariants = hasVariants ? product.variants.some((v) => v.is_available && v.stock_quantity > 0) : true;
    const canAddToCart = isSelectionComplete && maxStock > 0;
    const showNotify = hasVariants ? (isSelectionComplete ? maxStock === 0 : !hasAvailableVariants) : product.stock_quantity === 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header cartItems={totalItems} onCartClick={openCart} />
        <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
          <BackButton className="mb-6 text-lg" aria-label="Go back to previous page" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
            {/* Image Section */}
            <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-lg transition-shadow duration-300 hover:shadow-xl">
                {isImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
                  </div>
                )}
                {validImages.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 text-muted-foreground">
                    <p>No images available</p>
                  </div>
                )}
                <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                  <DialogTrigger asChild>
                    <button
                      className="w-full h-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="Zoom in on product image"
                      disabled={validImages.length === 0}
                    >
                      <img
                        src={validImages[selectedImage]?.image_url || product.thumbnail_image}
                        alt={validImages[selectedImage]?.alt_text || `${product.name} - Image ${selectedImage + 1}`}
                        className={cn(
                          'w-full h-full object-cover transition-transform duration-500 hover:scale-105',
                          isImageLoading || validImages.length === 0 ? 'opacity-0' : 'opacity-100'
                        )}
                        loading="eager"
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => handleImageError(selectedImage, validImages[selectedImage]?.image_url || product.thumbnail_image)}
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-none bg-background">
                    <Carousel className="w-full h-full" setApi={(api) => api?.scrollTo(selectedImage)}>
                      <CarouselContent>
                        {validImages.length > 0 ? (
                          validImages.map((image, index) => (
                            <CarouselItem key={image.id}>
                              <div className="flex items-center justify-center h-[80vh] p-4">
                                <img
                                  src={image.image_url}
                                  alt={image.alt_text || `${product.name} - Image ${index + 1}`}
                                  className="max-w-full max-h-full object-contain"
                                  loading="lazy"
                                  onError={() => handleImageError(index, image.image_url)}
                                />
                              </div>
                            </CarouselItem>
                          ))
                        ) : (
                          <CarouselItem>
                            <div className="flex items-center justify-center h-[80vh] p-4">
                              <img
                                src={product.thumbnail_image}
                                alt="No image available"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          </CarouselItem>
                        )}
                      </CarouselContent>
                      <CarouselPrevious className="left-4 bg-background/80 hover:bg-background" aria-label="Previous image" />
                      <CarouselNext className="right-4 bg-background/80 hover:bg-background" aria-label="Next image" />
                    </Carousel>
                  </DialogContent>
                </Dialog>
              </div>
              {validImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                  {validImages.map((image, index) => (
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
                      aria-label={`Select image ${index + 1} of ${product.name}`}
                    >
                      <img
                        src={image.image_url}
                        alt={image.alt_text || `${product.name} - Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                        onError={() => handleImageError(index, image.image_url)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Details Section */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{product.name}</h1>
                <p className="text-lg text-muted-foreground uppercase tracking-wider">{product.category_name}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-2xl md:text-3xl font-semibold text-primary">
                    {formatPrice(product.price, selectedVariant?.additional_price || 0)}
                  </p>
                  <Badge variant={stockStatus.variant} className="text-sm px-3 py-1">
                    {stockStatus.status === 'out' && <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />}
                    {stockStatus.message}
                  </Badge>
                  {product.new_arrival_date && (
                    <Badge variant="outline" className="text-sm px-3 py-1 bg-primary/10">
                      New Arrival
                    </Badge>
                  )}
                </div>
              </div>
              {product.description && (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">Description</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{product.description}</p>
                </div>
              )}
              {(product.show_jacket_size_chart || product.show_pants_size_chart) && (
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-foreground">Size Charts</h2>
                  <div className="flex flex-wrap gap-3">
                    {product.show_jacket_size_chart && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary"
                            aria-label="View jacket size chart"
                          >
                            <Ruler className="h-4 w-4" />
                            Jacket Size Chart
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Jacket Size Chart</DialogTitle>
                            <DialogDescription>Find the perfect fit for your jacket.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <img
                              src="/size-charts/jacket.jpg"
                              alt="Jacket Size Chart"
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {product.show_pants_size_chart && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 px-4 py-2 text-sm transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary"
                            aria-label="View pants size chart"
                          >
                            <Ruler className="h-4 w-4" />
                            Pants Size Chart
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Pants Size Chart</DialogTitle>
                            <DialogDescription>Find the perfect fit for your pants.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <img
                              src="/size-charts/pants.jpg"
                              alt="Pants Size Chart"
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              )}
              {hasRealColors(product) && distinctAvailableColors.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="color-select" className="text-lg font-semibold text-foreground">
                    Color
                  </Label>
                  <div id="color-select" className="flex flex-wrap gap-2">
                    {distinctAvailableColors.map((color) => {
                      const colorName = getColorName(color);
                      return (
                        <Button
                          key={color.id}
                          variant={selectedColor === colorName ? 'default' : 'outline'}
                          onClick={() => setSelectedColor(colorName)}
                          className={cn(
                            'px-4 py-2 text-sm transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary'
                          )}
                          aria-pressed={selectedColor === colorName}
                          aria-label={`Select color ${colorName}`}
                        >
                          {colorName}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              {hasRealSizes(product) && distinctAvailableSizes.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="size-select" className="text-lg font-semibold text-foreground">
                    Size
                  </Label>
                  <div id="size-select" className="flex flex-wrap gap-2">
                    {distinctAvailableSizes.map((size) => {
                      const sizeName = getSizeName(size);
                      return (
                        <Button
                          key={size.id}
                          variant={selectedSize === sizeName ? 'default' : 'outline'}
                          onClick={() => setSelectedSize(sizeName)}
                          className={cn(
                            'px-4 py-2 text-sm transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary'
                          )}
                          aria-pressed={selectedSize === sizeName}
                          aria-label={`Select size ${sizeName}`}
                        >
                          {sizeName}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <Label htmlFor="quantity-select" className="text-lg font-semibold text-foreground">
                  Quantity
                </Label>
                <div id="quantity-select" className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity === 1 || maxStock <= 0}
                    className="h-10 w-10 transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="text-xl font-medium w-12 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                    disabled={quantity >= maxStock || maxStock <= 0}
                    className="h-10 w-10 transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4 pt-4 sticky bottom-0 bg-background/95 py-4 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
                <Button
                  onClick={handleAddToCart}
                  className="w-full text-base py-6 font-medium transition-all duration-300 hover:bg-primary/90 focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={!canAddToCart || isAddingToCart}
                  aria-label={canAddToCart ? 'Add to cart' : 'Select options or out of stock'}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" aria-hidden="true" />
                  {isAddingToCart ? 'Adding...' : (canAddToCart ? 'Add to Cart' : (isSelectionComplete ? 'Out of Stock' : 'Add to Cart'))}
                </Button>
                <div className="flex flex-col sm:flex-row gap-3">
                  {user && (
                    <Button
                      variant="outline"
                      onClick={handleWishlistToggle}
                      className="flex-1 text-base py-6 transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary"
                      disabled={isAddingToWishlist}
                      aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart
                        className={cn(
                          'h-5 w-5 mr-2',
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
                  {showNotify && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 text-base py-6 transition-all duration-200 hover:bg-primary/10 focus:ring-2 focus:ring-primary"
                          aria-label="Notify when available"
                        >
                          <Bell className="h-5 w-5 mr-2" aria-hidden="true" />
                          Notify When Available
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md rounded-xl">
                        <DialogHeader className="space-y-2">
                          <DialogTitle className="text-xl">Stock Alert</DialogTitle>
                          <DialogDescription className="text-base">
                            We'll email you when "{product.name} ({selectedColor || 'Default'}, {selectedSize || 'One Size'})" is back in stock.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="email" className="text-sm">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Enter your email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={isSettingAlert}
                              className="mt-1 text-sm py-2"
                              required
                            />
                          </div>
                          <Button
                            onClick={handleStockAlert}
                            className="w-full text-base py-6 transition-all duration-200 hover:bg-primary/90 focus:ring-2 focus:ring-primary"
                            disabled={isSettingAlert || !email}
                            aria-label="Set stock alert"
                          >
                            {isSettingAlert ? (
                              <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
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
              <Separator />
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">Product Details</h2>
                <dl className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <dt className="font-medium">Category</dt>
                  <dd>{product.category_name}</dd>
                </dl>
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