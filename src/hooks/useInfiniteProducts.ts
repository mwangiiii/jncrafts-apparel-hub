import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface UseInfiniteProductsOptions {
  category?: string;
  pageSize?: number;
  enabled?: boolean;
}

// Cursor-based pagination state
interface ProductCursor {
  created_at: string;
  id: string;
}

export const useInfiniteProducts = ({ 
  category = 'all', 
  pageSize = 16,
  enabled = true 
}: UseInfiniteProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'lightweight', category],
    queryFn: async ({ pageParam }: { pageParam?: ProductCursor }) => {
      try {
        // Use lightweight RPC with keyset pagination for better performance
        const { data, error } = await supabase.rpc('get_products_lightweight', {
          p_category: category,
          p_limit: pageSize,
          p_cursor_created_at: pageParam?.created_at || null,
          p_cursor_id: pageParam?.id || null
        });

        if (error) {
          console.error('Error fetching products:', error);
          // Handle timeout errors more gracefully
          if (error.code === '57014') {
            throw new Error('Products are loading slowly due to high demand. Please try again.');
          }
          throw error;
        }

        // Transform minimal data to match expected format
        const products = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          images: item.thumbnail_image ? [item.thumbnail_image] : [],
          sizes: [], // Load on-demand when needed
          colors: [], // Load on-demand when needed
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          is_active: true,
          created_at: item.created_at,
          updated_at: item.created_at
        }));

        // Next page cursor is the last item's created_at and id
        const nextCursor = products.length === pageSize && products.length > 0 
          ? { created_at: products[products.length - 1].created_at, id: products[products.length - 1].id }
          : null;

        return {
          products,
          nextCursor,
          hasMore: products.length === pageSize
        };
      } catch (error: any) {
        // Simplified error handling - no complex fallbacks
        console.error('Products query failed:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes - aggressive caching
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Only retry network errors, not database timeouts
      if (error?.code === '57014') return false; // Don't retry timeouts
      if (error?.message?.includes('Failed to fetch')) return failureCount < 1;
      return failureCount < 1;
    },
    retryDelay: 1000, // Simple 1 second delay
  });
};

// Optimized categories hook
export const useProductCategories = () => {
  const queryClient = useQueryClient();
  
  return {
    queryKey: ['categories', 'lightweight'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_categories_fast');
      if (error) throw error;
      return ['all', ...(data || []).map((item: any) => item.category)];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - categories rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: false // Don't retry category queries
  };
};

// Minimal prefetch for critical above-the-fold content only
export const usePrefetchProducts = () => {
  const queryClient = useQueryClient();
  
  const prefetchCategory = (category: string) => {
    // Only prefetch if not already cached
    const existingData = queryClient.getQueryData(['products', 'lightweight', category]);
    if (existingData) return;

    queryClient.prefetchInfiniteQuery({
      queryKey: ['products', 'lightweight', category],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_products_lightweight', {
          p_category: category,
          p_limit: 8, // Minimal prefetch
          p_cursor_created_at: null,
          p_cursor_id: null
        });

        if (error) {
          console.error('Error prefetching products:', error);
          return; // Fail silently for prefetch
        }

        const products = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          images: item.thumbnail_image ? [item.thumbnail_image] : [],
          sizes: [],
          colors: [],
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          is_active: true,
          created_at: item.created_at,
          updated_at: item.created_at
        }));

        return {
          products,
          nextCursor: products.length > 0 
            ? { created_at: products[products.length - 1].created_at, id: products[products.length - 1].id }
            : null,
          hasMore: products.length === 8
        };
      },
      initialPageParam: undefined,
      staleTime: 10 * 60 * 1000,
    });
  };

  return { prefetchCategory };
};