import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ULTRA-FAST ADMIN PRODUCTS WITH DATABASE FUNCTION - NO USER DATA EVER
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
  pageSize = 50,
  enabled = true 
}: UseAdminProductsUltraFastOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products-ultra-fast', 'database-function', 'zero-user-data'],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }): Promise<AdminProductsPage> => {
      console.log('🚀 ULTRA-FAST ADMIN FETCH - DATABASE FUNCTION - Page:', pageParam);
      
      // CALL OPTIMIZED DATABASE FUNCTION - ZERO USER DATA ACCESS
      const { data, error } = await supabase.rpc('get_admin_products_ultra_fast', {
        p_limit: pageSize,
        p_offset: pageParam * pageSize
      });

      if (error) {
        console.error('🚨 ULTRA-FAST ADMIN FETCH FAILED:', error);
        throw error;
      }

      console.log('✅ ULTRA-FAST ADMIN FETCH SUCCESS:', data?.length || 0, 'products - ZERO USER DATA');

      return {
        products: data || [],
        nextCursor: (data?.length || 0) === pageSize ? pageParam + 1 : undefined,
        hasMore: (data?.length || 0) === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 10000, // 10 seconds for ultra-fast admin experience
    gcTime: 60 * 1000, // 1 minute cache
    enabled,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
    retryDelay: 100, // Ultra-fast retry
  });
};

export const useRefreshAdminProductsUltraFast = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    console.log('🚀 ULTRA-FAST ADMIN REFRESH - DATABASE FUNCTION');
    queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast', 'database-function', 'zero-user-data'] });
    queryClient.removeQueries({ queryKey: ['admin-products-ultra-fast', 'database-function', 'zero-user-data'] });
  };

  return { refreshProducts };
};