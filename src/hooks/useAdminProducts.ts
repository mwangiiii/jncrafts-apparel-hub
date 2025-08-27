import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface UseAdminProductsOptions {
  pageSize?: number;
  enabled?: boolean;
}

export const useAdminProducts = ({ 
  pageSize = 12,
  enabled = true 
}: UseAdminProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category,
          images,
          videos,
          thumbnail_index,
          sizes,
          colors,
          stock_quantity,
          new_arrival_date,
          is_active,
          description,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (error) throw error;

      return {
        products: data || [],
        nextPage: data && data.length === pageSize ? pageParam + 1 : null,
        hasMore: data && data.length === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on timeout errors
      if (error?.code === '57014') return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products', 'infinite'] });
  };

  return { refreshProducts };
};