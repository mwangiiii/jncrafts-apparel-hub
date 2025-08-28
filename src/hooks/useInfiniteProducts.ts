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
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      try {
        // Use the new optimized function for lightweight product listing
        const offset = pageParam || 0;
        
        const { data, error } = await supabase
          .rpc('get_products_lightweight_v2', {
            p_category: category,
            p_limit: pageSize,
            p_offset: offset
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
          images: item.thumbnail_image ? [{ 
            id: 'thumb', 
            image_url: item.thumbnail_image, 
            is_primary: true, 
            display_order: 0 
          }] : [],
          sizes: [], // Will be loaded on demand
          colors: [], // Will be loaded on demand
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          created_at: item.created_at,
          is_active: true,
          updated_at: item.created_at,
          has_colors: item.has_colors,
          has_sizes: item.has_sizes
        }));

        const result = {
          products,
          nextCursor: products.length === pageSize ? offset + pageSize : null,
          hasMore: products.length === pageSize
        };

        return result;
      } catch (error: any) {
        console.error('Products query failed:', error);
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
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
        // Use the new optimized function for prefetch
        const { data, error } = await supabase
          .rpc('get_products_lightweight_v2', {
            p_category: category,
            p_limit: 8, // Minimal prefetch
            p_offset: 0
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
          images: item.thumbnail_image ? [{ 
            id: 'thumb', 
            image_url: item.thumbnail_image, 
            is_primary: true, 
            display_order: 0 
          }] : [],
          sizes: [],
          colors: [],
          stock_quantity: item.stock_quantity,
          new_arrival_date: item.new_arrival_date,
          created_at: item.created_at,
          is_active: true,
          updated_at: item.created_at,
          has_colors: item.has_colors,
          has_sizes: item.has_sizes
        }));

        return {
          products,
          nextCursor: products.length === 8 ? 8 : null,
          hasMore: products.length === 8
        };
      },
      initialPageParam: 0,
      staleTime: 10 * 60 * 1000,
    });
  };

  return { prefetchCategory };
};