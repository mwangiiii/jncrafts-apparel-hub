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

  useEffect(() => {
    if (productImage) return;

    // Simple, fast fetch - get ANY image for this product
    const fetchImage = async () => {
      const { data } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', productId)
        .limit(1);
        
      if (data && data[0]) {
        setThumbnailUrl(data[0].image_url);
      }
    };

    fetchImage();
  }, [productId, productImage]);

  return (
    <img 
      src={thumbnailUrl}
      alt={productName}
      className={className}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (img.src !== '/placeholder.svg') {
          img.src = '/placeholder.svg';
        }
      }}
    />
  );
};