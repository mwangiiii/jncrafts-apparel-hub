import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

// Hook for loading full product details on demand
export const useProductDetail = (productId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['product', 'detail', productId],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          category,
          images,
          videos,
          thumbnail_index,
          sizes,
          colors,
          stock_quantity,
          new_arrival_date,
          is_active,
          created_at,
          updated_at
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product detail:', error);
        throw error;
      }

      return data;
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: false, // Don't retry detail queries
  });
};

// Hook for batch loading product details (for cart, wishlist, etc.)
export const useProductBatch = (productIds: string[], enabled: boolean = true) => {
  return useQuery({
    queryKey: ['products', 'batch', productIds.sort().join(',')],
    queryFn: async (): Promise<Product[]> => {
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category,
          images,
          sizes,
          colors,
          stock_quantity,
          is_active,
          created_at,
          updated_at
        `)
        .in('id', productIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching product batch:', error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && productIds.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
};