import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OptimizedProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_quantity: number;
  thumbnail_image: string | null;
  new_arrival_date: string | null;
  is_active: boolean;
}

interface UseOptimizedProductsOptions {
  category?: string;
  pageSize?: number;
  enabled?: boolean;
}

// Optimized hook for homepage products - only loads thumbnails
export const useOptimizedProducts = ({ 
  category, 
  pageSize = 12, 
  enabled = true 
}: UseOptimizedProductsOptions = {}) => {
  return useInfiniteQuery({
    queryKey: ['products', 'optimized', category],
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category,
          stock_quantity,
          new_arrival_date,
          is_active,
          product_images!left(
            image_url,
            is_primary,
            display_order
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching optimized products:', error);
        throw error;
      }

      // Transform data to include only thumbnail (display_order = 1)
      const products: OptimizedProduct[] = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        stock_quantity: product.stock_quantity,
        new_arrival_date: product.new_arrival_date,
        is_active: product.is_active,
        thumbnail_image: product.product_images?.find(img => img.display_order === 1)?.image_url || 
                        product.product_images?.[0]?.image_url || null
      }));

      return {
        products,
        nextCursor: products.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      return true;
    },
    refetchOnWindowFocus: false,
  });
};

// Hook for product categories
export const useOptimizedCategories = () => {
  return useQuery({
    queryKey: ['categories', 'optimized'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      const categories = Array.from(new Set(data?.map(item => item.category) || []));
      return categories.filter(Boolean);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: false,
  });
};