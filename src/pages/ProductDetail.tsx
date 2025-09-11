import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Heart, ShoppingCart, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useGlobalCart } from '@/hooks/useGlobalCart';
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
    closeCart
  } = useGlobalCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isStockAlertDialogOpen, setIsStockAlertDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_product_complete', { p_product_id: id });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Product not found');
      }

      const productData = data[0];
      const product = {
        id: productData.id,
        name: productData.name,
        price: productData.price,
        description: productData.description,
        category: productData.category,
        stock_quantity: productData.stock_quantity,
        is_active: productData.is_active,
        new_arrival_date: productData.new_arrival_date,
        thumbnail_index: productData.thumbnail_index,
        created_at: productData.created_at,
        updated_at: productData.updated_at,
        images: Array.isArray(productData.images) 
          ? productData.images.map((img: any) => ({
              id: img.id || 'temp',
              image_url: img.url || img.image_url || img,
              is_primary: img.is_primary || false,
              display_order: img.order || img.display_order || 0,
              product_id: productData.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
          : [],
        colors: Array.isArray(productData.colors) 
          ? productData.colors.map((color: any) => ({
              id: color.id,
              name: color.name,
              hex: color.hex || color.hex_code,
              available: color.available !== false
            }))
          : [],
        sizes: Array.isArray(productData.sizes) 
          ? productData.sizes.map((size: any) => ({
              id: size.id,
              name: size.name,
              category: size.category,
              available: size.available !== false
            }))
          : [],
        videos: (productData as any).videos ? Array.isArray((productData as any).videos) ? (productData as any).videos : [] : []
      };

      setProduct(product);
      if (product.sizes.length > 0) setSelectedSize(product.sizes[0].name);
      if (product.colors.length > 0) setSelectedColor(product.colors[0].name);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
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

    addToCart(product, quantity, selectedSize, selectedColor);
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

    try {
      // Create stock alert - generate proper SHA-256 hash for email
      const encoder = new TextEncoder();
      const data = encoder.encode(email.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const emailHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const { error } = await supabase
        .from('stock_alerts')
        .insert({
          user_id: user?.id || null, // Can be null for anonymous users
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          cartItems={cartItems.reduce((sum, item) => sum + item.quantity, 0)} 
          onCartClick={openCart} 
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          cartItems={cartItems.reduce((sum, item) => sum + item.quantity, 0)} 
          onCartClick={openCart} 
        />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">Product not found</div>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="min-h-screen bg-background">
        <Header 
          cartItems={cartItems.reduce((sum, item) => sum + item.quantity, 0)} 
          onCartClick={openCart} 
        />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <BackButton className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                <DialogTrigger asChild>
                  <img
                     src={getPrimaryImage(product)}
                     alt={product.name}
                     className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-300"
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
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded border-2 transition-colors ${
                      selectedImage === index 
                        ? 'border-primary' 
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                  >
                     <img
                       src={getPrimaryImage({ images: [image] } as Product)}
                       alt={`${product.name} thumbnail ${index + 1}`}
                       className="w-full h-full object-cover"
                     />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{product.name}</h1>
              <p className="text-lg text-muted-foreground uppercase tracking-wide">{product.category}</p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{formatPrice(product.price)}</p>
                {stockStatus && (
                  <Badge variant={stockStatus.variant} className="flex items-center gap-1">
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
              <div>
                <Label className="text-base font-semibold text-foreground">Size</Label>
                <div className="flex gap-2 mt-2">
                  {product.sizes!.map((size) => (
                    <Button
                      key={getSizeName(size)}
                      variant={selectedSize === getSizeName(size) ? "default" : "outline"}
                      onClick={() => setSelectedSize(getSizeName(size))}
                      className="min-w-[3rem]"
                    >
                      {getSizeName(size)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {hasRealColors(product) && (
              <div>
                <Label className="text-base font-semibold text-foreground">Color</Label>
                <div className="flex gap-2 mt-2">
                  {product.colors!.map((color) => (
                    <Button
                      key={getColorName(color)}
                      variant={selectedColor === getColorName(color) ? "default" : "outline"}
                      onClick={() => setSelectedColor(getColorName(color))}
                      className="capitalize"
                    >
                      {getColorName(color)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Label className="text-base font-semibold text-foreground">Quantity</Label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={product.stock_quantity === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={product.stock_quantity === 0}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-elegant"
                size="lg"
                disabled={product.stock_quantity === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>

              <div className="flex gap-2">
                {product.stock_quantity === 0 && (
                  <Dialog open={isStockAlertDialogOpen} onOpenChange={setIsStockAlertDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
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
                        <Button onClick={handleStockAlert} className="w-full">
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
          <div className="mt-8">
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