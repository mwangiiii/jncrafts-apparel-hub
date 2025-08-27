import { useState, useEffect } from "react";
import { Sparkles, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { format } from 'date-fns';

const NewArrivalsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isNewArrival = (product: Product) => {
    if (!product.new_arrival_date) return false;
    
    const arrivalDate = new Date(product.new_arrival_date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24));
    
    return daysDiff <= 10;
  };

  const handleMarkAsNewArrival = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          new_arrival_date: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product marked as new arrival.",
      });

      fetchProducts();
    } catch (error) {
      console.error('Error marking as new arrival:', error);
      toast({
        title: "Error",
        description: "Failed to mark as new arrival.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveNewArrival = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          new_arrival_date: null
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "New arrival status removed.",
      });

      fetchProducts();
    } catch (error) {
      console.error('Error removing new arrival status:', error);
      toast({
        title: "Error",
        description: "Failed to remove new arrival status.",
        variant: "destructive",
      });
    }
  };

  const handleBulkMarkNewArrivals = async () => {
    try {
      // Mark all products created in the last 3 days as new arrivals
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentProducts = products.filter(product => 
        new Date(product.created_at) >= threeDaysAgo && !product.new_arrival_date
      );

      if (recentProducts.length === 0) {
        toast({
          title: "No Products",
          description: "No recent products found to mark as new arrivals.",
        });
        return;
      }

      const { error } = await supabase
        .from('products')
        .update({ 
          new_arrival_date: new Date().toISOString()
        })
        .in('id', recentProducts.map(p => p.id));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${recentProducts.length} products marked as new arrivals.`,
      });

      fetchProducts();
    } catch (error) {
      console.error('Error bulk marking new arrivals:', error);
      toast({
        title: "Error",
        description: "Failed to bulk mark new arrivals.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4">Loading new arrivals manager...</div>;
  }

  const newArrivalProducts = products.filter(isNewArrival);
  const availableProducts = products.filter(p => !isNewArrival(p));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          New Arrivals Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Actions */}
        <div className="flex gap-4">
          <Button onClick={handleBulkMarkNewArrivals} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Mark Recent Products (3 days) as New
          </Button>
        </div>

        {/* Add Single Product */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="product-select">Mark Product as New Arrival</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - ${product.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => {
              if (selectedProductId) {
                handleMarkAsNewArrival(selectedProductId);
                setSelectedProductId("");
              }
            }}
            disabled={!selectedProductId}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Mark as New
          </Button>
        </div>

        {/* Current New Arrivals */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Current New Arrivals ({newArrivalProducts.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Labels auto-expire after 10 days
            </p>
          </div>
          
          {newArrivalProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No products currently marked as new arrivals.
            </p>
          ) : (
            <div className="space-y-4">
              {newArrivalProducts.map((product) => {
                const arrivalDate = new Date(product.new_arrival_date!);
                const daysRemaining = 10 - Math.floor((new Date().getTime() - arrivalDate.getTime()) / (1000 * 3600 * 24));

                return (
                  <Card key={product.id} className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Product Preview */}
                      <div className="w-20 h-20 flex-shrink-0 relative">
                        <img
                          src={product.images[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-full h-full object-cover rounded"
                        />
                        <div className="absolute -top-1 -right-1">
                          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs px-1 py-0.5 rounded animate-pulse">
                            NEW
                          </div>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {product.category} - ${product.price}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Marked: {format(arrivalDate, 'MMM dd, yyyy')}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            daysRemaining <= 2 
                              ? 'bg-red-100 text-red-700' 
                              : daysRemaining <= 5 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-green-100 text-green-700'
                          }`}>
                            {daysRemaining} days left
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveNewArrival(product.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Remove Label
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">How New Arrival Labels Work:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Labels automatically appear on products when marked as "New Arrival"</li>
            <li>• Labels automatically disappear after 10 days</li>
            <li>• You can manually remove labels at any time</li>
            <li>• Bulk action marks products created in the last 3 days</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewArrivalsManager;