import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface UseAdminProductsOptions {
  pageSize?: number;
  enabled?: boolean;
}

interface AdminProductsPage {
  products: Product[];
  nextCursor: number | undefined;
  hasMore: boolean;
}

export const useAdminProducts = ({ 
  pageSize = 20, // ULTRA AGGRESSIVE BATCH SIZE like homepage
  enabled = true 
}: UseAdminProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products', 'ultra-fast', 'normalized'],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }): Promise<AdminProductsPage> => {
      console.log('🔥 FORCE FETCHING ADMIN PRODUCTS - Page:', pageParam);
      
      // FORCE ULTRA-FAST NORMALIZED QUERY with all joined data for admin CRUD
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category,
          description,
          stock_quantity,
          is_active,
          new_arrival_date,
          thumbnail_index,
          created_at,
          updated_at,
          product_images(
            id,
            image_url,
            alt_text,
            display_order,
            is_primary
          ),
          product_colors(
            id,
            color_id,
            stock_quantity,
            additional_price,
            is_available,
            colors(name, hex_code)
          ),
          product_sizes(
            id,
            size_id,
            stock_quantity,
            additional_price,
            is_available,
            sizes(name, category)
          )
        `)
        .order('created_at', { ascending: false })
        .range(pageParam * pageSize, (pageParam * pageSize) + pageSize - 1);

      if (fallbackError) {
        console.error('🚨 FORCE FETCH FAILED:', fallbackError);
        throw fallbackError;
      }
      
      // Transform normalized data for admin CRUD operations
      const products = (fallbackData || []).map((item: any) => {
        const sortedImages = (item.product_images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order);

        return {
          ...item,
          images: sortedImages,
          thumbnail_image: sortedImages.find((img: any) => img.display_order === 1)?.image_url || 
                          sortedImages[0]?.image_url || null,
          colors: (item.product_colors || []).map((pc: any) => ({
            id: pc.id,
            name: pc.colors?.name || '',
            hex: pc.colors?.hex_code || '',
            stock: pc.stock_quantity || 0,
            additional_price: pc.additional_price || 0,
            available: pc.is_available !== false
          })).filter(Boolean),
          sizes: (item.product_sizes || []).map((ps: any) => ({
            id: ps.id,
            name: ps.sizes?.name || '',
            category: ps.sizes?.category || '',
            stock: ps.stock_quantity || 0,
            additional_price: ps.additional_price || 0,
            available: ps.is_available !== false
          })).filter(Boolean),
          videos: [],
          description: item.description || null,
          has_colors: (item.product_colors || []).length > 0,
          has_sizes: (item.product_sizes || []).length > 0
        };
      });

      console.log('✅ FORCE FETCHED', products.length, 'admin products');

      return {
        products,
        nextCursor: products.length === pageSize ? pageParam + 1 : undefined,
        hasMore: products.length === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 0, // FORCE FRESH DATA - no cache like homepage
    gcTime: 30 * 1000, // 30 seconds only - very aggressive
    enabled,
    refetchOnWindowFocus: true, // FORCE refetch on focus
    refetchOnMount: true, // FORCE refetch on mount
    refetchOnReconnect: true, // FORCE refetch on reconnect
    retry: 3, // Enable retries for reliable fetching
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Fast exponential backoff
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    console.log('🔄 FORCE REFRESH ADMIN PRODUCTS');
    queryClient.invalidateQueries({ queryKey: ['admin-products', 'ultra-fast', 'normalized'] });
  };

  return { refreshProducts };
};