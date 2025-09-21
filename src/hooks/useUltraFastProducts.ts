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

// Ultra-fast products hook with fallback to direct query
export const useUltraFastProducts = ({ 
  category = 'all', 
  pageSize = 12,
  enabled = true 
}: UseUltraFastProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'ultra-fast', category],
    queryFn: async ({ pageParam = 0 }): Promise<UltraFastProductPage> => {
      const actualLimit = Math.min(pageSize, 30);
      
      try {
        // First try the RPC function
        const rpcResult = await supabase.rpc('get_products_ultra_fast', {
          p_category: category,
          p_limit: actualLimit,
          p_offset: pageParam * actualLimit
        });

        if (!rpcResult.error && rpcResult.data) {
          const products = (rpcResult.data || []) as UltraFastProduct[];
          return {
            products,
            nextCursor: products.length >= actualLimit ? pageParam + 1 : undefined,
          };
        }

        console.warn('RPC failed, falling back to direct query:', rpcResult.error);

        // Fallback to direct product query
        let query = supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            category,
            stock_quantity,
            new_arrival_date,
            created_at,
            product_images!left(
              image_url,
              is_primary,
              display_order
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range(pageParam * actualLimit, (pageParam + 1) * actualLimit - 1);

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }

        const { data: fallbackData, error: fallbackError } = await query;

        if (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          throw fallbackError;
        }

        // Transform fallback data to match UltraFastProduct interface
        const products: UltraFastProduct[] = (fallbackData || []).map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          stock_quantity: product.stock_quantity,
          new_arrival_date: product.new_arrival_date,
          created_at: product.created_at,
          thumbnail_image: product.product_images?.find(img => img.display_order === 1)?.image_url || 
                          product.product_images?.[0]?.image_url || null,
          has_colors: false,
          has_sizes: false
        }));

        return {
          products,
          nextCursor: products.length >= actualLimit ? pageParam + 1 : undefined,
        };
      } catch (error) {
        console.error('All product fetch methods failed:', error);
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
    refetchOnMount: true, // Allow refetch on mount for fresh data
    refetchOnReconnect: true, // Allow refetch on reconnect
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

// Ultra-fast categories hook with fallback to direct query
export const useUltraFastCategories = () => {
  return useQuery({
    queryKey: ['categories', 'ultra-fast'],
    queryFn: async (): Promise<string[]> => {
      try {
        // First try the RPC function
        const rpcResult = await supabase.rpc('get_categories_fast');

        if (!rpcResult.error && rpcResult.data) {
          return (rpcResult.data || []).map(item => item.category).filter(Boolean);
        }

        console.warn('Categories RPC failed, falling back to direct query:', rpcResult.error);

        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .select('category')
          .eq('is_active', true);

        if (fallbackError) {
          console.error('Fallback categories query failed:', fallbackError);
          return [];
        }

        const categories = Array.from(new Set((fallbackData || []).map(item => item.category).filter(Boolean)));
        return categories;
      } catch (error) {
        console.error('All category fetch methods failed:', error);
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