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
  const colorMap = new Map(existing?.map(c => [c.name, c.id]) || []);
  const missing = normColors.filter(c => !colorMap.has(c));
  if (missing.length > 0) {
    const newColors = missing.map(c => ({ name: c, display_order: 999, is_active: true }));
    const { data: newData } = await supabase
      .from('colors')
      .insert(newColors)
      .select('id, name');
    newData?.forEach(nc => colorMap.set(nc.name, nc.id));
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
  const sizeMap = new Map(existing?.map(s => [s.name, s.id]) || []);
  const missing = normSizes.filter(s => !sizeMap.has(s));
  if (missing.length > 0) {
    const newSizes = missing.map(s => ({ name: s, category: 'clothing', display_order: 999, is_active: true }));
    const { data: newData } = await supabase
      .from('sizes')
      .insert(newSizes)
      .select('id, name');
    newData?.forEach(ns => sizeMap.set(ns.name, ns.id));
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
        const rollbackProduct = async () => {
          await supabase.from('products').delete().eq('id', productId);
        };

        // 3. Handle images
        if (productData.images.length > 0) {
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
            await rollbackProduct();
            throw new Error(`Failed to create images: ${imageError.message}`);
          }
          console.log('✅ Images created');
        }

        // 4. Handle variants
        if (productData.variants.length > 0) {
          const uniqueColors = [...new Set(productData.variants.filter(v => v.color).map(v => v.color!))];
          const uniqueSizes = [...new Set(productData.variants.filter(v => v.size).map(v => v.size!))];

          const colorMap = await getOrCreateColors(uniqueColors);
          const sizeMap = await getOrCreateSizes(uniqueSizes);

          const variantInserts = productData.variants.map(variant => {
            const colorId = variant.color ? colorMap.get(normalizeName(variant.color)) || null : null;
            const sizeId = variant.size ? sizeMap.get(normalizeName(variant.size)) || null : null;
            return {
              product_id: productId,
              color_id: colorId,
              size_id: sizeId,
              stock_quantity: variant.stock_quantity,
              additional_price: variant.additional_price,
              is_available: variant.stock_quantity > 0,
            };
          });

          const { error: variantError } = await supabase.from('product_variants').insert(variantInserts);
          if (variantError) {
            // Rollback images and product
            await supabase.from('product_images').delete().eq('product_id', productId);
            await rollbackProduct();
            throw new Error(`Failed to create variants: ${variantError.message}`);
          }
          console.log('✅ Variants created');
        }

        console.log('🎉 Product creation successful');
        return product;

      } catch (error) {
        console.error('💥 Product creation failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error: any) => {
      console.error('❌ Product creation failed:', error);
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

        console.log('✅ Category validated:', categoryData.name);

        // 2. Update main product
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

        // 3. Handle images diff
        const { data: existingImages } = await supabase
          .from('product_images')
          .select('id, image_url, display_order, is_primary')
          .eq('product_id', productId);

        const imagesToDelete = existingImages?.filter(img => !productData.images.includes(img.image_url)) || [];

        // Delete from storage and DB
        if (imagesToDelete.length > 0) {
          const fileNames = imagesToDelete
            .map(img => img.image_url.split('/').pop())
            .filter(name => name && !name.includes('default.jpg'));
          if (fileNames.length > 0) {
            await supabase.storage
              .from('images')
              .remove(fileNames.map(name => `thumbnails/${name}`));
          }
          await supabase
            .from('product_images')
            .delete()
            .in('id', imagesToDelete.map(img => img.id));
        }

        // Prepare updates and inserts
        const updatePromises: any[] = [];
        const insertImages: any[] = [];

        productData.images.forEach((imageUrl, index) => {
          const existingImage = existingImages?.find(img => img.image_url === imageUrl);
          if (existingImage) {
            updatePromises.push(
              supabase
                .from('product_images')
                .update({
                  display_order: index + 1,
                  is_primary: index === productData.thumbnailIndex,
                  is_active: true,
                })
                .eq('id', existingImage.id)
            );
          } else {
            insertImages.push({
              product_id: productId,
              image_url: imageUrl,
              alt_text: `${productData.name} image ${index + 1}`,
              display_order: index + 1,
              is_primary: index === productData.thumbnailIndex,
              is_active: true,
            });
          }
        });

        if (updatePromises.length > 0) {
          const updateResults = await Promise.all(updatePromises);
          const hasUpdateError = updateResults.some(r => r.error);
          if (hasUpdateError) {
            throw new Error('Failed to update some images');
          }
        }

        if (insertImages.length > 0) {
          const { error: insertError } = await supabase.from('product_images').insert(insertImages);
          if (insertError) {
            throw new Error(`Failed to insert new images: ${insertError.message}`);
          }
        }

        console.log('✅ Images updated');

        // 4. Handle variants diff
        const { data: existingVariantsRaw } = await supabase
          .from('product_variants')
          .select(`
            id, stock_quantity, additional_price,
            colors!inner(name as color_name),
            sizes!inner(name as size_name)
          `)
          .eq('product_id', productId);

        const existingVariants = existingVariantsRaw || [];
        const existingMap = new Map<string, { id: string; stock: number; additional_price: number }>();
        existingVariants.forEach((v: any) => {
          const normColor = v.color_name ? normalizeName(v.color_name) : '';
          const normSize = v.size_name ? normalizeName(v.size_name) : '';
          const key = `${normColor}|${normSize}`;
          existingMap.set(key, { id: v.id, stock: v.stock_quantity, additional_price: v.additional_price });
        });

        const desiredMap = new Map<string, { stock: number; additional_price: number }>();
        productData.variants.forEach(variant => {
          const normColor = variant.color ? normalizeName(variant.color) : '';
          const normSize = variant.size ? normalizeName(variant.size) : '';
          const key = `${normColor}|${normSize}`;
          desiredMap.set(key, { stock: variant.stock_quantity, additional_price: variant.additional_price });
        });

        // Delete obsolete
        const toDeleteIds: string[] = [];
        existingMap.forEach((_, key) => {
          if (!desiredMap.has(key)) {
            toDeleteIds.push(existingMap.get(key)!.id);
          }
        });
        if (toDeleteIds.length > 0) {
          const { error: deleteError } = await supabase.from('product_variants').delete().in('id', toDeleteIds);
          if (deleteError) {
            throw new Error(`Failed to delete obsolete variants: ${deleteError.message}`);
          }
        }

        // Get or create colors and sizes for desired
        const uniqueColors = [...new Set(productData.variants.filter(v => v.color).map(v => v.color!))];
        const uniqueSizes = [...new Set(productData.variants.filter(v => v.size).map(v => v.size!))];
        const colorMap = await getOrCreateColors(uniqueColors);
        const sizeMap = await getOrCreateSizes(uniqueSizes);

        // Updates and inserts
        const updatePromisesV: any[] = [];
        const insertVariants: any[] = [];
        desiredMap.forEach((desired, key) => {
          const [normColor, normSize] = key.split('|');
          const colorId = normColor ? colorMap.get(normColor) || null : null;
          const sizeId = normSize ? sizeMap.get(normSize) || null : null;
          const existing = existingMap.get(key);
          if (existing) {
            updatePromisesV.push(
              supabase
                .from('product_variants')
                .update({
                  stock_quantity: desired.stock,
                  additional_price: desired.additional_price,
                  is_available: desired.stock > 0,
                })
                .eq('id', existing.id)
            );
          } else {
            insertVariants.push({
              product_id: productId,
              color_id: colorId,
              size_id: sizeId,
              stock_quantity: desired.stock,
              additional_price: desired.additional_price,
              is_available: desired.stock > 0,
            });
          }
        });

        if (updatePromisesV.length > 0) {
          const updateResultsV = await Promise.all(updatePromisesV);
          const hasUpdateErrorV = updateResultsV.some(r => r.error);
          if (hasUpdateErrorV) {
            throw new Error('Failed to update some variants');
          }
        }

        if (insertVariants.length > 0) {
          const { error: insertErrorV } = await supabase.from('product_variants').insert(insertVariants);
          if (insertErrorV) {
            throw new Error(`Failed to insert new variants: ${insertErrorV.message}`);
          }
        }

        console.log('✅ Variants updated');

        console.log('🎉 Product update successful');
        return { id: productId };

      } catch (error) {
        console.error('💥 Product update failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('❌ Product update failed:', error);
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