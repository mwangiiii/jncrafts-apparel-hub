// useProductDetail.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

export const useProductDetail = (productId: string, enabled: boolean) => {
  console.log(`[useProductDetail] Fetching product with ID: ${productId}, Enabled: ${enabled}`);
console.log(`[useProductDetail] Fetching product with ID: ${productId}, Enabled: ${enabled}`);
return useQuery<Product, Error>({
  queryKey: ['product', productId],
  queryFn: async () => {
    console.log(`[useProductDetail] Executing get_product_complete for ID: ${productId}`);
    const { data, error } = await supabase
      .rpc('get_product_complete', { p_product_id: productId })
      .single();
    // ...
  },
  enabled: enabled && !!productId,
});
};