import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "@/contexts/CurrencyContext";
import { usePersistentCart } from "@/hooks/usePersistentCart";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/database";
import { getPrimaryImage, getSizeName, getColorName, hasRealSizes, hasRealColors } from "@/components/ProductDisplayHelper";

interface ProductReferenceCardProps {
  productId: string;
}

const ProductReferenceCard = ({ productId }: ProductReferenceCardProps) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { addToCart } = usePersistentCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_product_complete', { p_product_id: productId });

        if (error) throw error;
        
        if (!data || typeof data !== 'object') {
          console.error('Product not found:', productId);
          return;
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
                product_id: productId,
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
      }
    };

    fetchProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    
    if (!selectedSize || !selectedColor) {
      toast({
        title: "Selection Required",
        description: "Please select both size and color",
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
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  if (!product) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-muted rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
    <Card className="mb-4 border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <img
            src={getPrimaryImage(product)}
            alt={product.name}
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-bold text-primary">{formatPrice(product.price)}</p>
                  {stockStatus && (
                    <Badge variant={stockStatus.variant} className="text-xs">
                      {stockStatus.message}
                    </Badge>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/product/${product.id}`)}
                className="flex-shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Add to Cart Section */}
            <div className="mt-3 space-y-2">
              <div className="flex gap-2 text-xs">
                {/* Size Selection */}
                {hasRealSizes(product) && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Size:</span>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="text-xs bg-background border rounded px-1 py-0.5"
                    >
                      {product.sizes!.map((size) => (
                        <option key={getSizeName(size)} value={getSizeName(size)}>{getSizeName(size)}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Color Selection */}
                {hasRealColors(product) && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Color:</span>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="text-xs bg-background border rounded px-1 py-0.5 capitalize"
                    >
                      {product.colors!.map((color) => (
                        <option key={getColorName(color)} value={getColorName(color)}>{getColorName(color)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={product.stock_quantity === 0}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium w-8 text-center">{quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={product.stock_quantity === 0}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                  className="text-xs h-7"
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductReferenceCard;