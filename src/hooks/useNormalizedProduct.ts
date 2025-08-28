import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductImage, ProductColor, ProductSize } from '@/types/database';

// Hook for managing product images
export const useProductImages = (productId: string) => {
  return useQuery({
    queryKey: ['product', 'images', productId],
    queryFn: async (): Promise<ProductImage[]> => {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
};

// Hook for managing product colors
export const useProductColors = (productId: string) => {
  return useQuery({
    queryKey: ['product', 'colors', productId],
    queryFn: async (): Promise<ProductColor[]> => {
      const { data, error } = await supabase
        .from('product_colors')
        .select(`
          *,
          color:colors(*)
        `)
        .eq('product_id', productId)
        .eq('is_available', true)
        .order('color.display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
};

// Hook for managing product sizes
export const useProductSizes = (productId: string) => {
  return useQuery({
    queryKey: ['product', 'sizes', productId],
    queryFn: async (): Promise<ProductSize[]> => {
      const { data, error } = await supabase
        .from('product_sizes')
        .select(`
          *,
          size:sizes(*)
        `)
        .eq('product_id', productId)
        .eq('is_available', true)
        .order('size.display_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
};

// Hook for all available colors
export const useAllColors = () => {
  return useQuery({
    queryKey: ['colors', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Hook for all available sizes
export const useAllSizes = () => {
  return useQuery({
    queryKey: ['sizes', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Mutations for product management
export const useProductMutations = () => {
  const queryClient = useQueryClient();

  const addProductImage = useMutation({
    mutationFn: async (imageData: Omit<ProductImage, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('product_images')
        .insert(imageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', 'images', data.product_id] });
    },
  });

  const updateProductImage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductImage> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_images')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', 'images', data.product_id] });
    },
  });

  const deleteProductImage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['product', 'images'] });
    },
  });

  const addProductColor = useMutation({
    mutationFn: async (colorData: Omit<ProductColor, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('product_colors')
        .insert(colorData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', 'colors', data.product_id] });
    },
  });

  const addProductSize = useMutation({
    mutationFn: async (sizeData: Omit<ProductSize, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .insert(sizeData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', 'sizes', data.product_id] });
    },
  });

  return {
    addProductImage,
    updateProductImage,
    deleteProductImage,
    addProductColor,
    addProductSize,
  };
};