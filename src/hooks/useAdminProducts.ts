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
  pageSize = 50, // ULTRA AGGRESSIVE BATCH SIZE - ADMIN EFFICIENCY
  enabled = true 
}: UseAdminProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products-isolated', 'product-crud-only', 'no-user-data', 'force-fresh'],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }): Promise<AdminProductsPage> => {
      console.log('🔒 ADMIN-ONLY PRODUCT FETCH - ULTRA STRICT ISOLATION - Page:', pageParam);
      
      // ULTRA STRICT ROLE-BASED DATA ISOLATION - ADMIN PRODUCT MANAGEMENT ONLY
      // ✅ ALLOWED: Products, Images, Colors, Sizes, Categories ONLY
      // ❌ FORBIDDEN: ALL USER DATA (Wishlists, Carts, Profiles, Sessions, Orders, Discounts)
      const { data: productData, error: productError } = await supabase
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

      if (productError) {
        console.error('🚨 ADMIN PRODUCT FETCH FAILED - DATA ISOLATION BREACH?:', productError);
        throw productError;
      }
      
      // STRICT DATA TRANSFORMATION - ADMIN PRODUCT MANAGEMENT ONLY
      const products = (productData || []).map((item: any) => {
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

      console.log('✅ ADMIN-ISOLATED FETCH COMPLETE:', products.length, 'products (NO USER DATA)');

      return {
        products,
        nextCursor: products.length === pageSize ? pageParam + 1 : undefined,
        hasMore: products.length === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 0, // ULTRA AGGRESSIVE: NO STALE DATA EVER
    gcTime: 30 * 1000, // 30 second cache only
    enabled,
    refetchOnWindowFocus: true, // ULTRA AGGRESSIVE: Always fresh on focus
    refetchOnMount: true, // ULTRA AGGRESSIVE: Always fresh on mount  
    refetchOnReconnect: true, // ULTRA AGGRESSIVE: Always fresh on reconnect
    refetchInterval: 30000, // FORCE REFRESH EVERY 30 SECONDS
    retry: 1, // Fast fail for admin efficiency
    retryDelay: 200, // Minimal retry delay
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    console.log('🔄 ULTRA AGGRESSIVE ADMIN REFRESH - FORCE IMMEDIATE DATA');
    // FORCE REMOVE ALL CACHES AND REFETCH IMMEDIATELY
    queryClient.invalidateQueries({ queryKey: ['admin-products-isolated', 'product-crud-only', 'no-user-data', 'force-fresh'] });
    queryClient.removeQueries({ queryKey: ['admin-products-isolated', 'product-crud-only', 'no-user-data', 'force-fresh'] });
  };

  return { refreshProducts };
};