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
      try {
        // Use direct query for admin with all fields needed
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

        if (error) {
          console.error('Error fetching admin products:', error);
          throw error;
        }

        return {
          products: data || [],
          nextPage: data && data.length === pageSize ? pageParam + 1 : null,
          hasMore: data && data.length === pageSize
        };
      } catch (error: any) {
        // Handle timeout errors with smaller batches
        if (error?.code === '57014') {
          console.warn('Admin query timeout, using smaller batch...');
          const fallbackSize = Math.max(3, Math.floor(pageSize / 4));
          
          const { data, error: fallbackError } = await supabase
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
            .range(pageParam * fallbackSize, (pageParam + 1) * fallbackSize - 1);
            
          if (fallbackError) throw fallbackError;
          
          return {
            products: data || [],
            nextPage: data && data.length === fallbackSize ? pageParam + 1 : null,
            hasMore: data && data.length === fallbackSize
          };
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes for admin
    gcTime: 10 * 60 * 1000, // 10 minutes for admin
    enabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on timeout errors more than once
      if (error?.code === '57014' && failureCount >= 1) return false;
      // Don't retry on network errors
      if (error?.message?.includes('Failed to fetch')) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(300 * 2 ** attemptIndex, 3000),
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products', 'infinite'] });
  };

  return { refreshProducts };
};