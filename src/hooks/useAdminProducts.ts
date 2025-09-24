import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminProductsOptions {
  pageSize?: number;
  enabled?: boolean;
  category?: string;
}

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  category_name: string;
  description: string | null;
  stock_quantity: number;
  is_active: boolean;
  new_arrival_date: string | null;
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

export const useAdminProducts = ({
  pageSize = 12,
  enabled = true,
  category = 'all'
}: UseAdminProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products', 'ultra-fast', category],
    queryFn: async ({ pageParam = 0 }): Promise<AdminProductsPage> => {
      console.log(`🚀 Fetching admin products - Page: ${pageParam}, Category: ${category}, Limit: ${pageSize}`);

      const actualLimit = Math.min(pageSize, 30);
      const offset = pageParam * actualLimit;

      // Try RPC first
      const rpcStrategy = async (): Promise<AdminProduct[] | null> => {
        try {
          console.log('📞 Attempting RPC get_admin_products_ultra_fast...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const { data, error } = await supabase.rpc('get_admin_products_ultra_fast', {
            p_category_name: category === 'all' ? null : category,
            p_limit: actualLimit,
            p_offset: offset
          });

          clearTimeout(timeoutId);

          if (error) {
            console.error('RPC error:', error);
            return null;
          }

          if (!data || !Array.isArray(data)) {
            console.warn('RPC returned invalid data:', data);
            return null;
          }

          console.log(`✅ RPC success: ${data.length} products`);
          return data.map(product => ({
            ...product,
            thumbnail_image: product.thumbnail_image || 'https://ppljsayhwtlogficifar.supabase.co/storage/v1/object/public/images/thumbnails/default.jpg'
          }));
        } catch (error: any) {
          console.error('RPC failed:', error.message);
          return null;
        }
      };

      // Fallback to direct query
      const directStrategy = async (): Promise<AdminProduct[] | null> => {
        try {
          console.log('📞 Attempting direct query...');
          const query = supabase
            .from('products')
            .select(`
              id,
              name,
              price,
              description,
              is_active,
              new_arrival_date,
              categories(name),
              product_images(image_url, is_active, is_primary),
              product_variants(stock_quantity, color_id, size_id)
            `)
            .eq('product_images.is_active', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + actualLimit - 1);

          if (category !== 'all') {
            query.eq('categories.name', category);
          }

          const { data, error } = await query;

          if (error) {
            console.error('Direct query error:', error);
            return null;
          }

          if (!data || !Array.isArray(data)) {
            console.warn('Direct query returned invalid data:', data);
            return null;
          }

          const products = data.map(item => {
            const primaryImage = item.product_images?.find((img: any) => img.is_primary) || item.product_images?.[0];
            return {
              id: item.id,
              name: item.name,
              price: item.price,
              category_name: item.categories?.name || '',
              description: item.description || null,
              is_active: item.is_active,
              new_arrival_date: item.new_arrival_date,
              thumbnail_image: primaryImage?.image_url || 'https://ppljsayhwtlogficifar.supabase.co/storage/v1/object/public/images/thumbnails/default.jpg',
              stock_quantity: item.product_variants?.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0) || 0,
              total_images: item.product_images?.length || 0,
              has_colors: item.product_variants?.some((v: any) => v.color_id) || false,
              has_sizes: item.product_variants?.some((v: any) => v.size_id) || false,
              colors_count: [...new Set(item.product_variants?.map((v: any) => v.color_id))].filter(Boolean).length,
              sizes_count: [...new Set(item.product_variants?.map((v: any) => v.size_id))].filter(Boolean).length,
            };
          });

          console.log(`✅ Direct query success: ${products.length} products`);
          return products;
        } catch (error: any) {
          console.error('Direct query failed:', error.message);
          return null;
        }
      };

      let products: AdminProduct[] | null = await rpcStrategy();
      if (!products) {
        products = await directStrategy();
      }

      if (!products) {
        console.error('🚨 All strategies failed');
        throw new Error('All data fetching strategies failed. Please check your database connection.');
      }

      console.log(`🎉 Final result: ${products.length} products`);

      return {
        products,
        nextCursor: products.length >= actualLimit ? pageParam + 1 : undefined,
        hasMore: products.length >= actualLimit
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      const errorMsg = error?.message?.toLowerCase() || '';
      return errorMsg.includes('network') ||
             errorMsg.includes('timeout') ||
             errorMsg.includes('function') ||
             errorMsg.includes('not found') ||
             errorMsg.includes('connection');
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();

  const refreshProducts = async () => {
    console.log('🚀 Refreshing admin products...');
    await queryClient.invalidateQueries({ queryKey: ['admin-products', 'ultra-fast'] });
    console.log('✅ Admin products cache invalidated');
  };

  return { refreshProducts };
};