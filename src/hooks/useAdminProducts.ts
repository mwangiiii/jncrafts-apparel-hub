import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface UseAdminProductsOptions {
  pageSize?: number;
  enabled?: boolean;
}

// Cursor for admin products
interface AdminProductCursor {
  created_at: string;
  id: string;
}

export const useAdminProducts = ({ 
  pageSize = 8, // Smaller batch for admin
  enabled = true 
}: UseAdminProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products', 'keyset'],
    queryFn: async ({ pageParam }: { pageParam?: AdminProductCursor }) => {
      // Use direct query instead of non-existent RPC function
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category,
          description,
          stock_quantity,
          is_active,
          new_arrival_date,
          thumbnail_index,
          created_at,
          updated_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) {
        console.error('Error fetching admin products:', error);
        throw error;
      }

      // Transform data with empty arrays for relations
      const products = (data || []).map((item: any) => ({
        ...item,
        images: [], // Will be loaded on demand
        colors: [], // Will be loaded on demand
        sizes: [], // Will be loaded on demand
        videos: [], // Will be loaded on demand
        description: item.description || null
      }));

      const nextCursor = products.length === pageSize && products.length > 0
        ? { created_at: products[products.length - 1].created_at, id: products[products.length - 1].id }
        : null;

      return {
        products,
        nextCursor,
        hasMore: products.length === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 1 * 60 * 1000, // 1 minute for admin
    gcTime: 5 * 60 * 1000, // 5 minutes for admin
    enabled,
    refetchOnWindowFocus: false,
    retry: false, // No retries for admin queries
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products', 'keyset'] });
  };

  return { refreshProducts };
};