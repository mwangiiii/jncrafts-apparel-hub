// useCompleteProductManagement.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Variant {
  color: string | null;
  size: string | null;
  stock_quantity: number;
  additional_price: number;
}

interface ProductFormData {
  name: string;
  price: number;
  description?: string;
  category: string; // UUID
  images: string[];
  videos?: string[];
  thumbnailIndex: number;
  variants: Variant[];
  is_active: boolean;
}

interface CreateProductParams {
  productData: ProductFormData;
}

interface UpdateProductParams {
  productId: string;
  productData: ProductFormData;
}

const normalizeName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

const getOrCreateColors = async (uniqueColors: string[]): Promise<Map<string, string>> => {
  if (uniqueColors.length === 0) return new Map();
  const normColors = uniqueColors.map(normalizeName);
  const { data: existing } = await supabase
    .from('colors')
    .select('id, name')
    .in('name', normColors);
  const colorMap = new Map(existing?.map(c => [normalizeName(c.name), c.id]) || []);
  const missing = normColors.filter(c => !colorMap.has(c));
  if (missing.length > 0) {
    const newColors = missing.map(c => ({ name: c, display_order: 999, is_active: true }));
    const { data: newData } = await supabase
      .from('colors')
      .insert(newColors)
      .select('id, name');
    newData?.forEach(nc => colorMap.set(normalizeName(nc.name), nc.id));
  }
  return colorMap;
};

const getOrCreateSizes = async (uniqueSizes: string[]): Promise<Map<string, string>> => {
  if (uniqueSizes.length === 0) return new Map();
  const normSizes = uniqueSizes.map(normalizeName);
  const { data: existing } = await supabase
    .from('sizes')
    .select('id, name')
    .in('name', normSizes);
  const sizeMap = new Map(existing?.map(s => [normalizeName(s.name), s.id]) || []);
  const missing = normSizes.filter(s => !sizeMap.has(s));
  if (missing.length > 0) {
    const newSizes = missing.map(s => ({ name: s, category: 'clothing', display_order: 999, is_active: true }));
    const { data: newData } = await supabase
      .from('sizes')
      .insert(newSizes)
      .select('id, name');
    newData?.forEach(ns => sizeMap.set(normalizeName(ns.name), ns.id));
  }
  return sizeMap;
};

export const useCompleteProductManagement = () => {
  const queryClient = useQueryClient();

  const createCompleteProduct = useMutation({
    mutationFn: async ({ productData }: CreateProductParams) => {
      console.log('🚀 CREATING COMPLETE PRODUCT');
      
      try {
        // 1. Validate category
        const categoryId = productData.category;
        if (!categoryId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          throw new Error('Invalid category ID provided');
        }

        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('id', categoryId)
          .single();

        if (categoryError || !categoryData) {
          throw new Error(`Category with ID "${categoryId}" not found`);
        }

        console.log('✅ Category validated:', categoryData.name);

        // 2. Create main product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: categoryId,
            is_active: productData.is_active,
            thumbnail_index: productData.thumbnailIndex,
          })
          .select()
          .single();

        if (productError || !product) {
          throw new Error(`Failed to create product: ${productError?.message}`);
        }

        console.log('✅ Main product created:', product.id);

        let productId = product.id;

        // Rollback helper
        const rollback = async () => {
          await supabase.from('product_images').delete().eq('product_id', productId);
          await supabase.from('product_variants').delete().eq('product_id', productId);
          await supabase.from('products').delete().eq('id', productId);
        };

        // 3. Handle images
        if (productData.images && productData.images.length > 0) {
          console.log(`📸 Processing ${productData.images.length} images for product ${product.id}`);
          
          const imageInserts = productData.images.map((imageUrl, index) => ({
            product_id: productId,
            image_url: imageUrl,
            alt_text: `${productData.name} image ${index + 1}`,
            display_order: index + 1,
            is_primary: index === productData.thumbnailIndex,
            is_active: true,
          }));

          const { error: imageError } = await supabase.from('product_images').insert(imageInserts);
          if (imageError) {
            await rollback();
            throw new Error(`Failed to insert images: ${imageError.message}`);
          }
          console.log('✅ All images saved successfully');
        }

        // 4. Handle variants
        if (productData.variants && productData.variants.length > 0) {
          const uniqueColors = [...new Set(productData.variants.filter(v => v.color).map(v => v.color!))];
          const uniqueSizes = [...new Set(productData.variants.filter(v => v.size).map(v => v.size!))];

          const colorMap = await getOrCreateColors(uniqueColors);
          const sizeMap = await getOrCreateSizes(uniqueSizes);

          const variantInserts = productData.variants.map(variant => ({
            product_id: productId,
            color_id: variant.color ? colorMap.get(normalizeName(variant.color)) : null,
            size_id: variant.size ? sizeMap.get(normalizeName(variant.size)) : null,
            stock_quantity: variant.stock_quantity,
            additional_price: variant.additional_price,
            is_available: variant.stock_quantity > 0,
          }));

          const { error: variantError } = await supabase.from('product_variants').insert(variantInserts);
          if (variantError) {
            await rollback();
            throw new Error(`Failed to create product variants: ${variantError.message}`);
          }
          console.log('✅ Created product variants:', variantInserts.length);
        }

        // 5. Success
        console.log('🎉 COMPLETE PRODUCT CREATION FINISHED SUCCESSFULLY');
        return product;

      } catch (error) {
        console.error('💥 COMPLETE PRODUCT CREATION FAILED:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      toast({
        title: "Success",
        description: "Product created successfully with all details",
      });
    },
    onError: (error: any) => {
      console.error('❌ Product creation mutation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive"
      });
    }
  });

  const updateCompleteProduct = useMutation({
    mutationFn: async ({ productId, productData }: UpdateProductParams) => {
      console.log('🚀 UPDATING COMPLETE PRODUCT');
      
      try {
        // 1. Validate category
        const categoryId = productData.category;
        if (!categoryId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          throw new Error('Invalid category ID provided');
        }

        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('id', categoryId)
          .single();

        if (categoryError || !categoryData) {
          throw new Error(`Category with ID "${categoryId}" not found`);
        }

        console.log('✅ Category validated for update:', categoryData.name);

        // 2. Update the main product
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: categoryId,
            is_active: productData.is_active,
            thumbnail_index: productData.thumbnailIndex,
          })
          .eq('id', productId);

        if (productError) {
          throw new Error(`Failed to update product: ${productError.message}`);
        }

        console.log('✅ Main product updated');

        // 3. Handle images with diff
        const { data: existingImages } = await supabase
          .from('product_images')
          .select('id, image_url')
          .eq('product_id', productId);

        const existingImageUrls = existingImages?.map(img => img.image_url) || [];

        // Delete removed images
        const imagesToDelete = existingImageUrls.filter(url => !productData.images.includes(url));
        if (imagesToDelete.length > 0) {
          const fileNames = imagesToDelete
            .map(url => url.split('/').pop())
            .filter(name => name && !name.includes('default.jpg'));
          if (fileNames.length > 0) {
            await supabase.storage
              .from('images')
              .remove(fileNames.map(name => `thumbnails/${name}`));
          }
          await supabase
            .from('product_images')
            .delete()
            .eq('product_id', productId)
            .in('image_url', imagesToDelete);
          console.log('✅ Deleted removed images');
        }

        // Insert new images and update orders
        const imagePromises = productData.images.map(async (imageUrl, index) => {
          const isNew = !existingImageUrls.includes(imageUrl);
          const imageData = {
            product_id: productId,
            image_url: imageUrl,
            alt_text: `${productData.name} image ${index + 1}`,
            display_order: index + 1,
            is_primary: index === productData.thumbnailIndex,
            is_active: true,
          };
          if (isNew) {
            return supabase.from('product_images').insert(imageData);
          } else {
            return supabase
              .from('product_images')
              .update(imageData)
              .eq('product_id', productId)
              .eq('image_url', imageUrl);
          }
        });

        const imageResults = await Promise.all(imagePromises);
        const imageErrors = imageResults.filter(result => result.error);
        if (imageErrors.length > 0) {
          throw new Error(`Failed to save ${imageErrors.length} images`);
        }
        console.log('✅ Images updated');

        // 4. Handle variants with diff
        const { data: existingVariants } = await supabase
          .from('product_variants')
          .select('id, color_id, size_id, stock_quantity, additional_price')
          .eq('product_id', productId);

        // Delete all existing variants to recreate (simple approach, but can optimize with diff later)
        await supabase.from('product_variants').delete().eq('product_id', productId);

        if (productData.variants.length > 0) {
          const uniqueColors = [...new Set(productData.variants.filter(v => v.color).map(v => v.color!))];
          const uniqueSizes = [...new Set(productData.variants.filter(v => v.size).map(v => v.size!))];

          const colorMap = await getOrCreateColors(uniqueColors);
          const sizeMap = await getOrCreateSizes(uniqueSizes);

          const variantInserts = productData.variants.map(variant => ({
            product_id: productId,
            color_id: variant.color ? colorMap.get(normalizeName(variant.color)) : null,
            size_id: variant.size ? sizeMap.get(normalizeName(variant.size)) : null,
            stock_quantity: variant.stock_quantity,
            additional_price: variant.additional_price,
            is_available: variant.stock_quantity > 0,
          }));

          const { error: variantError } = await supabase.from('product_variants').insert(variantInserts);

          if (variantError) {
            throw new Error(`Failed to update product variants: ${variantError.message}`);
          }
          console.log('✅ Variants updated');
        }

        console.log('🎉 COMPLETE PRODUCT UPDATE FINISHED SUCCESSFULLY');
        return { id: productId };

      } catch (error) {
        console.error('💥 COMPLETE PRODUCT UPDATE FAILED:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      toast({
        title: "Success",
        description: "Product updated successfully with all details",
      });
    },
    onError: (error: any) => {
      console.error('❌ Product update mutation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive"
      });
    }
  });

  return {
    createCompleteProduct,
    updateCompleteProduct,
    isCreating: createCompleteProduct.isPending,
    isUpdating: updateCompleteProduct.isPending,
  };
};