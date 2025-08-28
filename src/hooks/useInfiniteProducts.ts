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
        // Use direct Supabase query instead of RPC for better reliability
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            category,
            images,
            thumbnail_index,
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
          .order('id', { ascending: false })
          .limit(pageSize);

        // Add category filter if not 'all'
        if (category !== 'all') {
          query = query.eq('category', category);
        }

        // Add cursor-based pagination
        if (pageParam?.created_at && pageParam?.id) {
          query = query.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`);
        }

        const { data, error } = await query;

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
          images: item.images || [],
          sizes: item.sizes || [],
          colors: item.colors || [],
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          is_active: item.is_active,
          created_at: item.created_at,
          updated_at: item.updated_at
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
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set((data || []).map(item => item.category))];
      return ['all', ...uniqueCategories];
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
        // Use direct Supabase query for prefetch too
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            category,
            images,
            thumbnail_index,
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
          .order('id', { ascending: false })
          .limit(8); // Minimal prefetch

        // Add category filter if not 'all'
        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error prefetching products:', error);
          return; // Fail silently for prefetch
        }

        const products = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          images: item.images || [],
          sizes: item.sizes || [],
          colors: item.colors || [],
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          is_active: item.is_active,
          created_at: item.created_at,
          updated_at: item.updated_at
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