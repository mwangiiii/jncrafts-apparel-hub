
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';

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
          description,
          category,
          stock_quantity,
          is_active,
          created_at,
          updated_at,
          product_images (
            id,
            image_url,
            alt_text,
            display_order,
            is_primary,
            is_active
          ),
          product_variants (
            id,
            stock_quantity,
            additional_price,
            colors (id, name, hex_code, is_active),
            sizes (id, name, category_id, is_active)
          )
        `)
        .in('id', productIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching product batch:', error);
        throw error;
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description || null,
        category: p.category || 'Uncategorized',
        stock_quantity: p.stock_quantity || 0,
        is_active: p.is_active,
        created_at: p.created_at,
        updated_at: p.updated_at,
        images: Array.isArray(p.product_images)
          ? p.product_images
              .filter((img: any) => img.is_active)
              .map((img: any) => ({
                id: img.id,
                image_url: img.image_url,
                alt_text: img.alt_text || `${p.name} image`,
                display_order: img.display_order || 0,
                is_primary: img.is_primary || false,
                product_id: p.id,
                created_at: img.created_at || new Date().toISOString(),
                updated_at: img.updated_at || new Date().toISOString(),
                is_active: img.is_active,
              }))
          : [],
        colors: Array.isArray(p.product_variants)
          ? [...new Set(p.product_variants
              .filter((v: any) => v.colors && v.colors.is_active)
              .map((v: any) => ({
                id: v.colors.id,
                name: v.colors.name,
                hex: v.colors.hex_code || '#000000',
                available: v.colors.is_active,
              })))
          ]
          : [],
        sizes: Array.isArray(p.product_variants)
          ? [...new Set(p.product_variants
              .filter((v: any) => v.sizes && v.sizes.is_active)
              .map((v: any) => ({
                id: v.sizes.id,
                name: v.sizes.name,
                category: v.sizes.category_id || null,
                available: v.sizes.is_active,
              })))
          ]
          : [],
        videos: [], // No videos
      }));
    },
    enabled: enabled && productIds.length > 0,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
};
