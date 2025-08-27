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
      try {
        // Use optimized RPC function for better performance
        const { data, error } = await supabase.rpc('get_products_optimized', {
          p_category: category,
          p_limit: pageSize,
          p_offset: pageParam * pageSize
        });

        if (error) {
          console.error('Error fetching products:', error);
          throw error;
        }

        // Transform data to match expected format
        const products = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          images: item.thumbnail_image ? [item.thumbnail_image] : [],
          sizes: item.sizes || [],
          colors: item.colors || [],
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          is_active: true,
          created_at: item.created_at,
          updated_at: item.created_at
        }));

        return {
          products,
          nextPage: products.length === pageSize ? pageParam + 1 : null,
          hasMore: products.length === pageSize
        };
      } catch (error: any) {
        // Handle timeout errors specifically
        if (error?.code === '57014') {
          console.warn('Query timeout, retrying with smaller batch...');
          // Fallback to smaller page size on timeout
          const fallbackSize = Math.max(5, Math.floor(pageSize / 2));
          const { data, error: fallbackError } = await supabase.rpc('get_products_optimized', {
            p_category: category,
            p_limit: fallbackSize,
            p_offset: pageParam * fallbackSize
          });
          
          if (fallbackError) throw fallbackError;
          
          const products = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            images: item.thumbnail_image ? [item.thumbnail_image] : [],
            sizes: item.sizes || [],
            colors: item.colors || [],
            stock_quantity: item.stock_quantity,
            new_arrival_date: item.new_arrival_date,
            is_active: true,
            created_at: item.created_at,
            updated_at: item.created_at
          }));
          
          return {
            products,
            nextPage: products.length === fallbackSize ? pageParam + 1 : null,
            hasMore: products.length === fallbackSize
          };
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on timeout errors more than once
      if (error?.code === '57014' && failureCount >= 1) return false;
      // Don't retry on network errors
      if (error?.message?.includes('Failed to fetch')) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000),
  });
};

export const usePrefetchProducts = () => {
  const queryClient = useQueryClient();
  
  const prefetchCategory = (category: string) => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ['products', 'infinite', category],
      queryFn: async () => {
        try {
          // Use the same optimized RPC function for prefetching
          const { data, error } = await supabase.rpc('get_products_optimized', {
            p_category: category,
            p_limit: 20,
            p_offset: 0
          });

          if (error) throw error;

          // Transform data to match expected format
          const products = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            images: item.thumbnail_image ? [item.thumbnail_image] : [],
            sizes: item.sizes || [],
            colors: item.colors || [],
            stock_quantity: item.stock_quantity,
            new_arrival_date: item.new_arrival_date,
            is_active: true,
            created_at: item.created_at,
            updated_at: item.created_at
          }));

          return {
            products,
            nextPage: products.length === 20 ? 1 : null,
            hasMore: products.length === 20
          };
        } catch (error: any) {
          // Fail silently on prefetch errors
          console.warn('Prefetch failed:', error);
          return {
            products: [],
            nextPage: null,
            hasMore: false
          };
        }
      },
      initialPageParam: 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  return { prefetchCategory };
};