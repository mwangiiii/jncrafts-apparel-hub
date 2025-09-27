import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_product_complete', { p_product_id: id });
        if (error) throw error;
        if (!data || !data[0]) {
          setError('Product not found');
          return;
        }
        setProduct(data[0]);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching the product.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!product) {
    return <p>No product details available.</p>;
  }

  return (
    <Card className="p-4">
      <Button onClick={() => navigate(-1)} className="mb-4">Back</Button>
      <CardContent>
        <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
        <p className="text-lg text-muted-foreground mb-4">{product.description}</p>
        <p className="text-xl font-semibold text-primary">KSh {product.price}</p>
        <Badge variant="secondary" className="mt-2">
          {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
        </Badge>
      </CardContent>
    </Card>
  );
};

export default ProductDetail;