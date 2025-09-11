import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

// Hook for loading full product details on demand using normalized structure
export const useProductDetail = (productId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['product', 'detail', productId],
    queryFn: async (): Promise<Product | null> => {
      // Create an AbortController for timeout
      const controller = new AbortController();
      
      // Set 7-second timeout (less than server timeout of 8s)
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      
      try {
        const { data, error } = await supabase
          .rpc('get_product_complete', { p_product_id: productId })
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
          console.error('Error fetching product detail:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          return null;
        }

        const productData = data[0];
        
        // Transform the response to match our Product interface
        return {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          description: productData.description,
          category: productData.category,
          stock_quantity: productData.stock_quantity,
          is_active: productData.is_active,
          new_arrival_date: productData.new_arrival_date,
          thumbnail_index: productData.thumbnail_index,
          created_at: productData.created_at,
          updated_at: productData.updated_at,
          images: Array.isArray(productData.images) 
            ? productData.images.map((img: any) => ({
                id: img.id || 'temp',
                image_url: img.url || img.image_url || img,
                is_primary: img.is_primary || false,
                display_order: img.order || img.display_order || 0,
                product_id: productId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }))
            : [],
          colors: Array.isArray(productData.colors) 
            ? productData.colors.map((color: any) => ({
                id: color.id,
                name: color.name,
                hex: color.hex || color.hex_code,
                available: color.available !== false
              }))
            : [],
          sizes: Array.isArray(productData.sizes) 
            ? productData.sizes.map((size: any) => ({
                id: size.id,
                name: size.name,
                category: size.category,
                available: size.available !== false
              }))
            : [],
          videos: (productData as any).videos ? Array.isArray((productData as any).videos) ? (productData as any).videos : [] : []
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out - please try again');
        }
        throw err;
      }
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: false, // Don't retry detail queries
  });
};

// Hook for batch loading product details (for cart, wishlist, etc.)
export const useProductBatch = (productIds: string[], enabled: boolean = true) => {
  return useQuery({
    queryKey: ['products', 'batch', productIds.sort().join(',')],
    queryFn: async (): Promise<Product[]> => {
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          category,
          stock_quantity,
          is_active,
          created_at,
          updated_at
        `)
        .in('id', productIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching product batch:', error);
        throw error;
      }

      return (data || []).map(p => ({
        ...p,
        images: [],
        sizes: [],
        colors: [],
        videos: [],
        description: null
      }));
    },
    enabled: enabled && productIds.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
};