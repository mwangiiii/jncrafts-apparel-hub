import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ULTRA-FAST ADMIN PRODUCTS WITH MATERIALIZED VIEW - FORCE OPTIMIZED
interface UseAdminProductsUltraFastOptions {
  pageSize?: number;
  enabled?: boolean;
}

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  stock_quantity: number;
  is_active: boolean;
  new_arrival_date: string | null;
  thumbnail_index: number | null;
  created_at: string;
  updated_at: string;
  thumbnail_image: string | null;
  total_images: number;
  has_colors: boolean;
  has_sizes: boolean;
  colors_count: number;
  sizes_count: number;
}

interface AdminProductsPage {
  products: AdminProduct[];
  nextCursor: number | undefined;
  hasMore: boolean;
}

export const useAdminProductsUltraFast = ({ 
  pageSize = 8, // FORCE REDUCED: 8 products max for ultra speed
  enabled = true 
}: UseAdminProductsUltraFastOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products-ultra-fast', 'materialized-view', 'force-optimized'],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }): Promise<AdminProductsPage> => {
      console.log('🚀 ULTRA-FAST ADMIN FETCH - MATERIALIZED VIEW - Page:', pageParam);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for ultra speed
      
      try {
        // CALL OPTIMIZED DATABASE FUNCTION WITH MATERIALIZED VIEW
        const { data, error } = await supabase.rpc('get_admin_products_ultra_fast', {
          p_limit: pageSize,
          p_offset: pageParam * pageSize
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('🚨 ULTRA-FAST ADMIN FETCH FAILED:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log('✅ ULTRA-FAST ADMIN FETCH SUCCESS:', data?.length || 0, 'products - MATERIALIZED VIEW');

        return {
          products: data || [],
          nextCursor: (data?.length || 0) === pageSize ? pageParam + 1 : undefined,
          hasMore: (data?.length || 0) === pageSize
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out - database may be slow');
        }
        throw err;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 15000, // 15 seconds for ultra-fast admin updates
    gcTime: 2 * 60 * 1000, // 2 minute cache
    enabled,
    refetchOnWindowFocus: false, // Aggressive caching for speed
    refetchOnMount: false, // Use cache first for ultra speed
    refetchOnReconnect: false, // Maximum speed optimization
    retry: false, // No retries for maximum speed
  });
};

export const useRefreshAdminProductsUltraFast = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = async () => {
    console.log('🚀 ULTRA-FAST ADMIN REFRESH - MATERIALIZED VIEW');
    
    // First refresh the materialized view
    try {
      await supabase.rpc('refresh_admin_products_view');
      console.log('✅ Materialized view refreshed');
    } catch (error) {
      console.warn('⚠️ Failed to refresh materialized view:', error);
    }
    
    // Then invalidate queries
    queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast', 'materialized-view', 'force-optimized'] });
    queryClient.removeQueries({ queryKey: ['admin-products-ultra-fast', 'materialized-view', 'force-optimized'] });
  };

  return { refreshProducts };
};