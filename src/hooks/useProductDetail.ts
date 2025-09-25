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

      if (error) {
        console.error('[useProductDetail] Error fetching product:', error);
        throw new Error(error.message || 'Failed to fetch product');
      }

      if (!data) {
        console.error('[useProductDetail] No product data returned for ID:', productId);
        throw new Error('Product not found');
      }

      // Validate image URLs
      const validatedData: Product = {
        ...data,
        images: data.images.filter((img) => {
          const isValid = img.image_url && img.is_active && img.image_url.includes('supabase.co/storage/v1/object/public/images/thumbnails');
          if (!isValid) {
            console.warn(`[useProductDetail] Invalid image URL filtered out: ${img.image_url}`);
          }
          return isValid;
        }),
      };

      console.log('[useProductDetail] Product data fetched:', JSON.stringify(validatedData, null, 2));
      return validatedData;
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};