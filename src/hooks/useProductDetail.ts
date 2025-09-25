// useProductDetail.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

export const useProductDetail = (productId: string, enabled: boolean) => {
  console.log(`Fetching product with ID: ${productId}`); // Debug log

  return useQuery<Product, Error>({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_product_complete', { p_product_id: productId })
        .single();

      if (error) {
        console.error('Error fetching product:', error); // Debug log
        throw new Error(error.message || 'Failed to fetch product');
      }

      if (!data) {
        console.error('No product data returned for ID:', productId); // Debug log
        throw new Error('Product not found');
      }

      console.log('Product data fetched:', data); // Debug log
      return data as Product;
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};