import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Trash2, GripVertical } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  images: string[];
  price: number;
}

interface FeaturedProduct {
  id: string;
  product_id: string;
  display_order: number;
  is_active: boolean;
  products: Product;
}

const FeaturedProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchFeaturedProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, images, price')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setProducts(data);
    }
  };

  const fetchFeaturedProducts = async () => {
    const { data } = await supabase
      .from('homepage_featured')
      .select(`
        id,
        product_id,
        display_order,
        is_active,
        products:product_id (
          id,
          name,
          images,
          price
        )
      `)
      .order('display_order');
    
    if (data) {
      const validFeatured = data.filter(item => item.products);
      setFeaturedProducts(validFeatured as FeaturedProduct[]);
    }
  };

  const addFeaturedProduct = async () => {
    if (!selectedProductId) {
      toast({
        title: "No product selected",
        description: "Please select a product to feature",
        variant: "destructive"
      });
      return;
    }

    // Check if product is already featured
    const alreadyFeatured = featuredProducts.some(fp => fp.product_id === selectedProductId);
    if (alreadyFeatured) {
      toast({
        title: "Product already featured",
        description: "This product is already in the featured list",
        variant: "destructive"
      });
      return;
    }

    const maxOrder = Math.max(...featuredProducts.map(fp => fp.display_order), 0);

    const { error } = await supabase
      .from('homepage_featured')
      .insert({
        product_id: selectedProductId,
        display_order: maxOrder + 1,
        is_active: true
      });

    if (error) {
      toast({
        title: "Error adding featured product",
        description: "Please try again",
        variant: "destructive"
      });
    } else {
      await fetchFeaturedProducts();
      setSelectedProductId('');
      toast({
        title: "Featured product added",
        description: "The product has been added to the homepage carousel"
      });
    }
  };

  const updateDisplayOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from('homepage_featured')
      .update({ display_order: newOrder })
      .eq('id', id);

    if (!error) {
      await fetchFeaturedProducts();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('homepage_featured')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      await fetchFeaturedProducts();
    }
  };

  const removeFeaturedProduct = async (id: string) => {
    if (!confirm('Remove this product from featured list?')) return;

    const { error } = await supabase
      .from('homepage_featured')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error removing featured product",
        description: "Please try again",
        variant: "destructive"
      });
    } else {
      await fetchFeaturedProducts();
      toast({
        title: "Featured product removed",
        description: "The product has been removed from the homepage carousel"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Products Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-grow">
            <label className="block text-sm font-medium mb-2">Add Featured Product</label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product to feature" />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter(product => !featuredProducts.some(fp => fp.product_id === product.id))
                  .map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - KES {product.price?.toLocaleString()}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addFeaturedProduct} disabled={!selectedProductId}>
            Add to Featured
          </Button>
        </div>

        <div className="space-y-3">
          {featuredProducts.map((featured) => (
            <Card key={featured.id} className={`${!featured.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <div className="flex-shrink-0">
                    {featured.products.images?.[0] && (
                      <img
                        src={featured.products.images[0]}
                        alt={featured.products.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </div>

                  <div className="flex-grow">
                    <h4 className="font-medium">{featured.products.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      KES {featured.products.price?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Order: {featured.display_order}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={featured.display_order}
                      onChange={(e) => updateDisplayOrder(featured.id, parseInt(e.target.value))}
                      className="w-20"
                      min="0"
                    />
                    
                    <Button
                      variant={featured.is_active ? "default" : "secondary"}
                      size="sm"
                      onClick={() => toggleActive(featured.id, featured.is_active)}
                    >
                      {featured.is_active ? "Active" : "Inactive"}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFeaturedProduct(featured.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {featuredProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No featured products yet. Add products to display them in the homepage carousel.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturedProductsManager;