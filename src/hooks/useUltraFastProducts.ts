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

// Ultra-fast products hook with timeout protection and optimized caching
export const useUltraFastProducts = ({ 
  category = 'all', 
  pageSize = 12, // Reduced for ultra-fast loading
  enabled = true 
}: UseUltraFastProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'ultra-fast', category],
    queryFn: async ({ pageParam = 0 }): Promise<UltraFastProductPage> => {
      const actualLimit = Math.min(pageSize, 12); // Cap at 12 to avoid timeouts
      
      try {
        const result = await supabase.rpc('get_products_ultra_fast', {
          p_category: category,
          p_limit: actualLimit,
          p_offset: pageParam * actualLimit
        });
        
        if (result.error) {
          console.error('Error fetching ultra-fast products:', result.error);
          throw result.error;
        }

        const products = (result.data || []) as UltraFastProduct[];

        return {
          products,
          nextCursor: products.length >= actualLimit ? pageParam + 1 : undefined,
        };
      } catch (error) {
        console.error('Failed to fetch products:', error);
        // Return empty result on error to prevent infinite loading
        return {
          products: [],
          nextCursor: undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes - aggressive caching
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled,
    retry: (failureCount, error) => {
      // Only retry once for timeout errors
      return failureCount < 1 && error?.message?.includes('timeout');
    },
    retryDelay: 1000,
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

export const useUltraFastFeatured = (limit: number = 4) => { // Optimized limit for speed
  return useQuery({
    queryKey: ['featured-products', 'ultra-fast', limit],
    queryFn: async (): Promise<UltraFastFeaturedProduct[]> => {
      try {
        const { data, error } = await supabase.rpc('get_featured_products_ultra_fast', {
          p_limit: Math.min(limit, 6) // Cap at 6 for speed
        });

        if (error) {
          console.error('Error fetching ultra-fast featured products:', error);
          return []; // Return empty array instead of throwing
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
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
        return []; // Graceful fallback
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - featured products cache longer
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error) => {
      // Only retry once for timeout errors
      return failureCount < 1 && error?.message?.includes('timeout');
    },
    retryDelay: 1500,
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

// Ultra-fast categories hook with timeout protection
export const useUltraFastCategories = () => {
  return useQuery({
    queryKey: ['categories', 'ultra-fast'],
    queryFn: async (): Promise<string[]> => {
      try {
        const { data, error } = await supabase.rpc('get_categories_fast');

        if (error) {
          console.error('Error fetching categories:', error);
          return []; // Return empty array as fallback
        }

        return (data || []).map(item => item.category).filter(Boolean);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        return []; // Graceful fallback
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour - categories rarely change
    gcTime: 4 * 60 * 60 * 1000, // 4 hours
    retry: (failureCount, error) => {
      return failureCount < 1 && error?.message?.includes('timeout');
    },
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};