import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

export const useProductDetail = (productId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['product', 'detail', productId],
    queryFn: async (): Promise<Product | null> => {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        console.log('Fetching product detail for ID:', productId);

        const { data, error } = await supabase
          .rpc('get_product_complete', { p_product_id: productId })
          .eq('is_active', true) // Ensure public access respects is_active
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
          console.error('Error fetching product detail:', error);
          throw new Error(`Failed to load product: ${error.message}`);
        }

        if (!data || typeof data !== 'object') {
          console.warn('No product data returned for ID:', productId);
          return null;
        }

        const productData = data as any;
        console.log('Product data received:', productData);

        const transformedProduct: Product = {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          description: productData.description || null,
          category: productData.category_name || productData.category || 'Uncategorized',
          stock_quantity: productData.stock_quantity || 0,
          is_active: productData.is_active,
          new_arrival_date: productData.new_arrival_date || null,
          thumbnail_index: productData.thumbnail_index || 0,
          created_at: productData.created_at,
          updated_at: productData.updated_at,
          images: Array.isArray(productData.images)
            ? productData.images.map((img: any) => ({
                id: img.id || `temp-${img.image_url}`,
                image_url: img.image_url,
                is_primary: img.is_primary || false,
                display_order: img.display_order || 0,
                product_id: productId,
                alt_text: img.alt_text || `${productData.name} image`,
                created_at: img.created_at || new Date().toISOString(),
                updated_at: img.updated_at || new Date().toISOString(),
                is_active: img.is_active !== false,
              }))
            : [],
          colors: Array.isArray(productData.colors)
            ? productData.colors.map((color: any) => ({
                id: color.id,
                name: color.name,
                hex: color.hex_code || '#000000',
                available: color.is_active !== false,
              }))
            : [],
          sizes: Array.isArray(productData.sizes)
            ? productData.sizes.map((size: any) => ({
                id: size.id,
                name: size.name,
                category: size.category_id || null,
                available: size.is_active !== false,
              }))
            : [],
          videos: Array.isArray(productData.videos) ? productData.videos : [],
        };

        console.log('Transformed product:', transformedProduct);
        return transformedProduct;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out - please try again');
        }
        console.error('Product detail fetch error:', err);
        throw err;
      }
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.message.includes('Product ID is required') || error.message.includes('Request timed out')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};