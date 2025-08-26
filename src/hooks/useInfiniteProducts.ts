import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface UseInfiniteProductsOptions {
  category?: string;
  pageSize?: number;
  enabled?: boolean;
}

export const useInfiniteProducts = ({ 
  category = 'all', 
  pageSize = 20,
  enabled = true 
}: UseInfiniteProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', category],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
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
          new_arrival_date,
          is_active,
          created_at,
          updated_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        products: data || [],
        nextPage: data && data.length === pageSize ? pageParam + 1 : null,
        hasMore: data && data.length === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const usePrefetchProducts = () => {
  const queryClient = useQueryClient();
  
  const prefetchCategory = (category: string) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['products', 'infinite', category],
      queryFn: async () => {
        let query = supabase
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
            new_arrival_date,
            is_active,
            created_at,
            updated_at
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;

        return {
          products: data || [],
          nextPage: data && data.length === 20 ? 1 : null,
          hasMore: data && data.length === 20
        };
      },
      initialPageParam: 0,
      staleTime: 10 * 60 * 1000,
    });
  };

  return { prefetchCategory };
};