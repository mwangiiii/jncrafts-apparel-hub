import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CartThumbnailProps {
  productId: string;
  productImage?: string | null;
  productName: string;
  className?: string;
}

export const CartThumbnail = ({ productId, productImage, productName, className = "w-16 h-16 object-cover rounded-lg" }: CartThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(productImage || '/placeholder.svg');
  const [isLoading, setIsLoading] = useState(!productImage);

  useEffect(() => {
    const fetchThumbnail = async () => {
      if (productImage) {
        setThumbnailUrl(productImage);
        return;
      }

      try {
        // Get the primary image directly from product_images table
        const { data, error } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', productId)
          .or('is_primary.eq.true,display_order.eq.0')
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setThumbnailUrl(data[0].image_url);
        } else {
          setThumbnailUrl('/placeholder.svg');
        }
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
        setThumbnailUrl('/placeholder.svg');
      } finally {
        setIsLoading(false);
      }
    };

    if (!productImage) {
      fetchThumbnail();
    }
  }, [productId, productImage]);

  const handleError = () => {
    if (thumbnailUrl !== '/placeholder.svg') {
      setThumbnailUrl('/placeholder.svg');
    }
  };

  if (isLoading && !productImage) {
    return (
      <div className={`${className} bg-muted animate-pulse flex items-center justify-center`}>
        <div className="w-6 h-6 bg-muted-foreground/20 rounded"></div>
      </div>
    );
  }

  return (
    <img 
      src={thumbnailUrl}
      alt={productName}
      className={className}
      onError={handleError}
    />
  );
};