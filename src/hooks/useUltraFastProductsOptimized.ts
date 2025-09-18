import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Ultra-optimized product interface
export interface UltraOptimizedProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  thumbnail_image: string | null;
  stock_quantity: number;
  new_arrival_date: string | null;
  created_at: string;
  has_colors: boolean;
  has_sizes: boolean;
}

interface UltraOptimizedProductPage {
  products: UltraOptimizedProduct[];
  nextCursor: number | undefined;
}

interface UseUltraFastProductsOptimizedOptions {
  category?: string;
  pageSize?: number;
  enabled?: boolean;
}

// Ultra-optimized products hook with aggressive prefetching
export const useUltraFastProductsOptimized = ({ 
  category = 'all', 
  pageSize = 20, 
  enabled = true 
}: UseUltraFastProductsOptimizedOptions = {}) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: ['products', 'ultra-optimized', category],
    queryFn: async ({ pageParam = 0 }): Promise<UltraOptimizedProductPage> => {
      // Main query
      const { data, error } = await supabase.rpc('get_products_ultra_fast', {
        p_category: category,
        p_limit: pageSize,
        p_offset: pageParam * pageSize
      });

      if (error) {
        console.error('Error fetching ultra-fast products:', error);
        throw error;
      }

      const products = (data || []) as UltraOptimizedProduct[];

      // Aggressive prefetching of next page
      if (products.length === pageSize) {
        const nextPageParam = pageParam + 1;
        queryClient.prefetchInfiniteQuery({
          queryKey: ['products', 'ultra-optimized', category],
          queryFn: async () => {
            const { data: prefetchData } = await supabase.rpc('prefetch_products_next_page', {
              p_category: category,
              p_current_offset: pageParam * pageSize,
              p_page_size: pageSize
            });
            return {
              products: (prefetchData || []) as UltraOptimizedProduct[],
              nextCursor: (prefetchData || []).length === pageSize ? nextPageParam + 1 : undefined,
            };
          },
          initialPageParam: nextPageParam,
          getNextPageParam: (lastPage) => lastPage.nextCursor,
          staleTime: 30 * 1000, // 30 seconds for prefetch
        });
      }

      return {
        products,
        nextCursor: products.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 60 * 1000, // 1 minute - aggressive caching
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    retry: false, // No retries for maximum speed
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Ultra-aggressive caching
    refetchOnReconnect: false,
  });
};

// Ultra-fast featured products with image preloading
export const useUltraFastFeaturedOptimized = (limit: number = 6) => {
  return useInfiniteQuery({
    queryKey: ['featured-products', 'ultra-optimized', limit],
    queryFn: async (): Promise<{ products: any[]; nextCursor: undefined }> => {
      const { data, error } = await supabase.rpc('get_featured_products_ultra_fast', {
        p_limit: limit
      });

      if (error) {
        console.error('Error fetching ultra-fast featured products:', error);
        throw error;
      }

      const products = (data || []);
      
      // Preload images in the background
      products.forEach((product: any) => {
        if (product.thumbnail_image) {
          const img = new Image();
          img.src = product.thumbnail_image;
        }
      });

      return {
        products,
        nextCursor: undefined, // Featured products don't paginate
      };
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - featured products rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};