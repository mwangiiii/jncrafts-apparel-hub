import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Ultra-fast product interface matching materialized view
export interface UltraFastProduct {
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

interface UltraFastProductPage {
  products: UltraFastProduct[];
  nextCursor: number | undefined;
}

interface UseUltraFastProductsOptions {
  category?: string;
  pageSize?: number;
  enabled?: boolean;
}

// Ultra-fast products hook using materialized view and optimized indexes
export const useUltraFastProducts = ({ 
  category = 'all', 
  pageSize = 16, // Reduced for ultra-fast loading
  enabled = true 
}: UseUltraFastProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'ultra-fast', category],
    queryFn: async ({ pageParam = 0 }): Promise<UltraFastProductPage> => {
      // Try ultra-fast function first, with fallback to direct function
      let data, error;
      
      try {
        const result = await supabase.rpc('get_products_ultra_fast', {
          p_category: category,
          p_limit: Math.min(pageSize, 30), // Cap at 30 for speed
          p_offset: pageParam * pageSize
        });
        data = result.data;
        error = result.error;
      } catch (timeoutError) {
        console.warn('Primary function timed out, using fallback:', timeoutError);
        // Fallback to direct function if timeout occurs
        const fallbackResult = await supabase.rpc('get_products_direct_fast', {
          p_category: category,
          p_limit: Math.min(pageSize, 20),
          p_offset: pageParam * pageSize
        });
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Error fetching ultra-fast products:', error);
        throw error;
      }

      const products = (data || []) as UltraFastProduct[];

      return {
        products,
        nextCursor: products.length >= Math.min(pageSize, 20) ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 60 * 1000, // 1 minute - aggressive caching
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled,
    retry: 1, // One retry with fallback
    retryDelay: 500,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

// Ultra-fast featured products hook
export interface UltraFastFeaturedProduct {
  id: string;
  display_order: number;
  product_id: string;
  name: string;
  price: number;
  category: string;
  thumbnail_image: string | null;
  stock_quantity: number;
  new_arrival_date: string | null;
}

export const useUltraFastFeatured = (limit: number = 4) => { // Reduced default limit
  return useQuery({
    queryKey: ['featured-products', 'ultra-fast', limit],
    queryFn: async (): Promise<UltraFastFeaturedProduct[]> => {
      const { data, error } = await supabase.rpc('get_featured_products_ultra_fast', {
        p_limit: Math.min(limit, 6) // Cap at 6 for speed
      });

      if (error) {
        console.error('Error fetching ultra-fast featured products:', error);
        throw error;
      }

      const products = (data || []) as UltraFastFeaturedProduct[];
      
      // Preload images aggressively
      products.forEach((product) => {
        if (product.thumbnail_image) {
          const img = new Image();
          img.src = product.thumbnail_image;
        }
      });

      return products;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - featured products cache longer
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

// Hook to refresh materialized view when needed (admin only)
export const useRefreshProductsCache = () => {
  return async () => {
    try {
      await supabase.rpc('refresh_products_landing_view');
    } catch (error) {
      console.error('Error refreshing products cache:', error);
      throw error;
    }
  };
};

// Ultra-fast categories hook (cached heavily)
export const useUltraFastCategories = () => {
  return useQuery({
    queryKey: ['categories', 'ultra-fast'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('get_categories_fast');

      if (error) throw error;

      return (data || []).map(item => item.category).filter(Boolean);
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};