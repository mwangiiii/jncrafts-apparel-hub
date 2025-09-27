// useProductDetail.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

export const useProductDetail = (productId: string, enabled: boolean) => {
  console.log(`[useProductDetail] Fetching product with ID: ${productId}, Enabled: ${enabled}`);

  return useQuery<Product, Error>({
    queryKey: ['product', productId],
    queryFn: async () => {
      console.log(`[useProductDetail] Executing get_product_complete for ID: ${productId}`);
      const { data, error } = await supabase
        .rpc('get_product_complete', { p_product_id: productId })
        .single();

      if (error || !data || !data.id) {
        console.error('[useProductDetail] Error fetching product:', error, 'Data:', data);
        throw new Error(error?.message || 'Product not found or invalid data');
      }

      // Validate and transform data
      const validatedData: Product = {
        ...data,
        price: typeof data.price === 'number' && !isNaN(data.price) ? data.price : 0,
        stock_quantity: data.stock_quantity || 0,
        images: (data.images || []).filter((img) => {
          const isValid = img.image_url && img.is_active && img.image_url.includes('supabase.co/storage/v1/object/public/images/thumbnails');
          if (!isValid) {
            console.warn(`[useProductDetail] Invalid image URL filtered out: ${img.image_url}`);
          }
          return isValid;
        }),
        colors: (data.colors || []).filter((color) => color.is_active),
        sizes: (data.sizes || []).filter((size) => size.is_active),
        variants: (data.variants || []).filter((variant) => variant.is_available),
      };

      console.log('[useProductDetail] Product data fetched:', JSON.stringify(validatedData, null, 2));
      return validatedData;
    },
    enabled: enabled && !!productId,
    staleTime: 10 * 60 * 1000, // 10 minutes for public data
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
};