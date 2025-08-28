import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeaturedProduct {
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

// Optimized hook for homepage featured products
export const useOptimizedFeatured = () => {
  return useQuery({
    queryKey: ['featured-products', 'lightweight'],
    queryFn: async (): Promise<FeaturedProduct[]> => {
      // Use lightweight join query
      const { data, error } = await supabase
        .from('homepage_featured')
        .select(`
          id,
          display_order,
          product_id,
          products!inner (
            name,
            price,
            category,
            images,
            thumbnail_index,
            stock_quantity,
            new_arrival_date
          )
        `)
        .eq('is_active', true)
        .eq('products.is_active', true)
        .order('display_order')
        .limit(6); // Limit featured products

      if (error) {
        console.error('Error fetching featured products:', error);
        throw error;
      }

      // Transform the data
      return (data || []).map((item: any) => ({
        id: item.id,
        display_order: item.display_order,
        product_id: item.product_id,
        name: item.products.name,
        price: item.products.price,
        category: item.products.category,
        thumbnail_image: item.products.images && item.products.images.length > 0 
          ? item.products.images[item.products.thumbnail_index || 0] 
          : null,
        stock_quantity: item.products.stock_quantity,
        new_arrival_date: item.products.new_arrival_date,
      }));
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - featured products rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: false,
    refetchOnWindowFocus: false,
  });
};