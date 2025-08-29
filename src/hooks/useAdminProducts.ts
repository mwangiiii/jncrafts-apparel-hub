import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

interface UseAdminProductsOptions {
  pageSize?: number;
  enabled?: boolean;
}

// Cursor for admin products
interface AdminProductCursor {
  created_at: string;
  id: string;
}

export const useAdminProducts = ({ 
  pageSize = 8, // Smaller batch for admin
  enabled = true 
}: UseAdminProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['admin-products', 'keyset'],
    queryFn: async ({ pageParam }: { pageParam?: AdminProductCursor }) => {
      // Enhanced query with thumbnail images for admin management
      const { data, error } = await supabase
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
            colors(name, hex_code)
          ),
          product_sizes(
            id,
            size_id,
            sizes(name, category)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) {
        console.error('Error fetching admin products:', error);
        throw error;
      }

      // Transform data with proper thumbnail handling
      const products = (data || []).map((item: any) => {
        // Sort images by display_order and find thumbnail
        const sortedImages = (item.product_images || [])
          .sort((a: any, b: any) => a.display_order - b.display_order);

        return {
          ...item,
          images: sortedImages, // Full image data with display_order
          thumbnail_image: sortedImages.find((img: any) => img.display_order === 1)?.image_url || 
                          sortedImages[0]?.image_url || null,
          colors: (item.product_colors || []).map((pc: any) => pc.colors).filter(Boolean),
          sizes: (item.product_sizes || []).map((ps: any) => ps.sizes).filter(Boolean),
          videos: [], // Videos not in normalized tables yet
          description: item.description || null
        };
      });

      const nextCursor = products.length === pageSize && products.length > 0
        ? { created_at: products[products.length - 1].created_at, id: products[products.length - 1].id }
        : null;

      return {
        products,
        nextCursor,
        hasMore: products.length === pageSize
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 1 * 60 * 1000, // 1 minute for admin
    gcTime: 5 * 60 * 1000, // 5 minutes for admin
    enabled,
    refetchOnWindowFocus: false,
    retry: false, // No retries for admin queries
  });
};

export const useRefreshAdminProducts = () => {
  const queryClient = useQueryClient();
  
  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products', 'keyset'] });
  };

  return { refreshProducts };
};