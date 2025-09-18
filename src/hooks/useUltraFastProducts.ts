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
  pageSize = 20, 
  enabled = true 
}: UseUltraFastProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'ultra-fast', category],
    queryFn: async ({ pageParam = 0 }): Promise<UltraFastProductPage> => {
      const { data, error } = await supabase.rpc('get_products_ultra_fast', {
        p_category: category,
        p_limit: pageSize,
        p_offset: pageParam * pageSize
      });

      if (error) {
        console.error('Error fetching ultra-fast products:', error);
        throw error;
      }

      const products = (data || []) as UltraFastProduct[];

      return {
        products,
        nextCursor: products.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds - ultra-fast refresh
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    retry: false, // No retries for maximum speed
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Aggressive caching for ultra-fast loading
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

export const useUltraFastFeatured = (limit: number = 6) => {
  return useQuery({
    queryKey: ['featured-products', 'ultra-fast', limit],
    queryFn: async (): Promise<UltraFastFeaturedProduct[]> => {
      const { data, error } = await supabase.rpc('get_featured_products_ultra_fast', {
        p_limit: limit
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
    staleTime: 30 * 1000, // 30 seconds - aggressive refresh
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // No retries for ultra-fast performance
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Aggressive caching for performance
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