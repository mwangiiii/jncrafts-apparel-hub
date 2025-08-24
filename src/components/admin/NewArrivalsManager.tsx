import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  images: string[];
  price: number;
  new_arrival_date?: string;
  created_at: string;
}

const NewArrivalsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, images, price, new_arrival_date, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) {
      setProducts(data);
    }
  };

  const markAsNewArrival = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ new_arrival_date: new Date().toISOString() })
      .eq('id', productId);

    if (error) {
      toast({
        title: "Error updating product",
        description: "Failed to mark as new arrival",
        variant: "destructive"
      });
    } else {
      await fetchProducts();
      toast({
        title: "New arrival marked",
        description: "Product will show 'New Arrival' badge for 10 days"
      });
    }
  };

  const removeNewArrival = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ new_arrival_date: null })
      .eq('id', productId);

    if (error) {
      toast({
        title: "Error updating product",
        description: "Failed to remove new arrival status",
        variant: "destructive"
      });
    } else {
      await fetchProducts();
      toast({
        title: "New arrival status removed",
        description: "Product badge has been removed"
      });
    }
  };

  const isNewArrival = (newArrivalDate?: string) => {
    if (!newArrivalDate) return false;
    const arrivalDate = new Date(newArrivalDate);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    return arrivalDate > tenDaysAgo;
  };

  const getDaysRemaining = (newArrivalDate: string) => {
    const arrivalDate = new Date(newArrivalDate);
    const expiryDate = new Date(arrivalDate.getTime() + 10 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          New Arrivals Manager
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage "New Arrival" badges that automatically expire after 10 days
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.map((product) => {
            const isNew = isNewArrival(product.new_arrival_date);
            const daysLeft = product.new_arrival_date ? getDaysRemaining(product.new_arrival_date) : 0;
            
            return (
              <Card key={product.id} className={`${isNew ? 'border-primary/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{product.name}</h4>
                        {isNew && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            New Arrival
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        KES {product.price?.toLocaleString()}
                      </p>
                      {product.new_arrival_date && (
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {isNew 
                              ? `${daysLeft} days left` 
                              : 'Expired'
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!isNew ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsNewArrival(product.id)}
                        >
                          Mark as New Arrival
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => removeNewArrival(product.id)}
                        >
                          Remove Badge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Add some products first.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewArrivalsManager;