// useProductDetail.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

export const useProductDetail = (productId: string, enabled: boolean) => {
  return useQuery<Product, Error>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_product_complete', { p_product_id: productId })
        .single();

      if (error || !data || !data.id) {
        throw new Error(error?.message || 'Product not found or invalid data');
      }

      // Derive thumbnail_image for consistency with get_public_products_ultra_fast
      const thumbnailImage = data.images?.find((img) => img.is_primary)?.image_url ||
        data.images?.find((img) => img.display_order === 1)?.image_url ||
        'https://ppljsayhwtlogficifar.supabase.co/storage/v1/object/public/images/thumbnails/default.jpg';

      const validatedData: Product = {
        ...data,
        price: typeof data.price === 'number' && !isNaN(data.price) ? data.price : 0,
        stock_quantity: data.stock_quantity || 0,
        images: (data.images || []).filter((img) => img.is_active && img.image_url.includes('supabase.co/storage/v1/object/public/images/thumbnails')),
        colors: (data.colors || []).filter((color) => color.is_active),
        sizes: (data.sizes || []).filter((size) => size.is_active),
        variants: (data.variants || []).filter((variant) => variant.is_available),
        thumbnail_image: thumbnailImage,
      };

      return validatedData;
    },
    enabled: enabled && !!productId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
};