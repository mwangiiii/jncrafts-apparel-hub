import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProductFormData {
  name: string;
  price: number;
  description?: string;
  category: string; // This should be category UUID, not name
  images: string[];
  videos?: string[];
  thumbnailIndex: number;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
}

interface CreateProductParams {
  productData: ProductFormData;
}

interface UpdateProductParams {
  productId: string;
  productData: ProductFormData;
}

export const useCompleteProductManagement = () => {
  const queryClient = useQueryClient();

  const createCompleteProduct = useMutation({
    mutationFn: async ({ productData }: CreateProductParams) => {
      console.log('🚀 CREATING COMPLETE PRODUCT WITH NORMALIZED STRUCTURE');
      
      try {
        // 1. Get category ID from category name if needed
        let categoryId = productData.category;
        if (!productData.category.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', productData.category)
            .single();

          if (categoryError || !categoryData) {
            throw new Error(`Category "${productData.category}" not found`);
          }
          categoryId = categoryData.id;
        }

        // 2. Create the main product (stock_quantity goes to product_variants, not products)
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: categoryId,
            is_active: productData.is_active,
            thumbnail_index: productData.thumbnailIndex || 0,
            new_arrival_date: null // Can be set later if needed
          })
          .select()
          .single();

        if (productError) {
          console.error('❌ Product creation failed:', productError);
          throw new Error(`Failed to create product: ${productError.message}`);
        }

        console.log('✅ Main product created:', product.id);

        // 3. Handle images
        if (productData.images && productData.images.length > 0) {
          console.log(`📸 Processing ${productData.images.length} images for product ${product.id}`);
          
          const imagePromises = productData.images.map(async (imageUrl, index) => {
            const result = await supabase
              .from('product_images')
              .insert({
                product_id: product.id,
                image_url: imageUrl,
                alt_text: `${productData.name} image ${index + 1}`,
                display_order: index + 1, // Start from 1, not 0
                is_primary: index === (productData.thumbnailIndex || 0),
                is_active: true
              });
            
            if (result.error) {
              console.error(`❌ Failed to insert image ${index + 1}:`, result.error);
              throw result.error;
            } else {
              console.log(`✅ Successfully inserted image ${index + 1}`);
            }
            
            return result;
          });

          await Promise.all(imagePromises);
          console.log('✅ All images saved successfully');
        }

        // 4. Handle product variants (colors and sizes combined)
        if ((productData.colors && productData.colors.length > 0) || 
            (productData.sizes && productData.sizes.length > 0)) {
          
          // Get or create colors
          const colorIds = [];
          if (productData.colors && productData.colors.length > 0) {
            for (const colorName of productData.colors) {
              const { data: existingColor } = await supabase
                .from('colors')
                .select('id')
                .eq('name', colorName)
                .single();

              let colorId = existingColor?.id;

              if (!colorId) {
                const { data: newColor, error: colorError } = await supabase
                  .from('colors')
                  .insert({
                    name: colorName,
                    display_order: 999,
                    is_active: true
                  })
                  .select('id')
                  .single();

                if (colorError) {
                  console.error('❌ Failed to create color:', colorName, colorError);
                  continue;
                }
                colorId = newColor.id;
                console.log('✅ Created new color:', colorName);
              }
              colorIds.push(colorId);
            }
          }

          // Get or create sizes
          const sizeIds = [];
          if (productData.sizes && productData.sizes.length > 0) {
            for (const sizeName of productData.sizes) {
              const { data: existingSize } = await supabase
                .from('sizes')
                .select('id')
                .eq('name', sizeName)
                .single();

              let sizeId = existingSize?.id;

              if (!sizeId) {
                const { data: newSize, error: sizeError } = await supabase
                  .from('sizes')
                  .insert({
                    name: sizeName,
                    category: 'clothing',
                    display_order: 999,
                    is_active: true
                  })
                  .select('id')
                  .single();

                if (sizeError) {
                  console.error('❌ Failed to create size:', sizeName, sizeError);
                  continue;
                }
                sizeId = newSize.id;
                console.log('✅ Created new size:', sizeName);
              }
              sizeIds.push(sizeId);
            }
          }

          // Create product variants for each color/size combination
          const variants = [];
          
          // If we have both colors and sizes, create combinations
          if (colorIds.length > 0 && sizeIds.length > 0) {
            for (const colorId of colorIds) {
              for (const sizeId of sizeIds) {
                variants.push({
                  product_id: product.id,
                  color_id: colorId,
                  size_id: sizeId,
                  stock_quantity: Math.floor(productData.stock_quantity / (colorIds.length * sizeIds.length)),
                  additional_price: 0,
                  is_available: true
                });
              }
            }
          }
          // If only colors, create color-only variants
          else if (colorIds.length > 0) {
            for (const colorId of colorIds) {
              variants.push({
                product_id: product.id,
                color_id: colorId,
                size_id: null,
                stock_quantity: Math.floor(productData.stock_quantity / colorIds.length),
                additional_price: 0,
                is_available: true
              });
            }
          }
          // If only sizes, create size-only variants
          else if (sizeIds.length > 0) {
            for (const sizeId of sizeIds) {
              variants.push({
                product_id: product.id,
                color_id: null,
                size_id: sizeId,
                stock_quantity: Math.floor(productData.stock_quantity / sizeIds.length),
                additional_price: 0,
                is_available: true
              });
            }
          }

          // Insert all variants
          if (variants.length > 0) {
            const { error: variantError } = await supabase
              .from('product_variants')
              .insert(variants);

            if (variantError) {
              console.error('❌ Failed to create product variants:', variantError);
              throw new Error(`Failed to create product variants: ${variantError.message}`);
            } else {
              console.log('✅ Created product variants:', variants.length);
            }
          }
        }

        // 5. No materialized view refresh needed (removed non-existent functions)
        console.log('🎉 COMPLETE PRODUCT CREATION FINISHED SUCCESSFULLY');
        return product;

      } catch (error) {
        console.error('💥 COMPLETE PRODUCT CREATION FAILED:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
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
      console.log('🚀 UPDATING COMPLETE PRODUCT WITH NORMALIZED STRUCTURE');
      
      try {
        // 1. Get category ID from category name if needed
        let categoryId = productData.category;
        if (!productData.category.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', productData.category)
            .single();

          if (categoryError || !categoryData) {
            throw new Error(`Category "${productData.category}" not found`);
          }
          categoryId = categoryData.id;
        }

        // 2. Update the main product (stock_quantity goes to product_variants, not products)
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: categoryId,
            is_active: productData.is_active,
            thumbnail_index: productData.thumbnailIndex || 0
          })
          .eq('id', productId);

        if (productError) {
          throw new Error(`Failed to update product: ${productError.message}`);
        }

        console.log('✅ Main product updated');

        // 3. Clear existing images and recreate them
        await supabase.from('product_images').delete().eq('product_id', productId);
        
        if (productData.images && productData.images.length > 0) {
          const imagePromises = productData.images.map((imageUrl, index) => 
            supabase
              .from('product_images')
              .insert({
                product_id: productId,
                image_url: imageUrl,
                alt_text: `${productData.name} image ${index + 1}`,
                display_order: index + 1, // Start from 1, not 0
                is_primary: index === (productData.thumbnailIndex || 0),
                is_active: true
              })
          );

          const imageResults = await Promise.all(imagePromises);
          const imageErrors = imageResults.filter(result => result.error);
          
          if (imageErrors.length > 0) {
            throw new Error(`Failed to save ${imageErrors.length} images`);
          }
          console.log('✅ Images updated');
        }

        // 4. Clear existing product variants and recreate them
        await supabase.from('product_variants').delete().eq('product_id', productId);
        
        if ((productData.colors && productData.colors.length > 0) || 
            (productData.sizes && productData.sizes.length > 0)) {
          
          // Get or create colors
          const colorIds = [];
          if (productData.colors && productData.colors.length > 0) {
            for (const colorName of productData.colors) {
              const { data: existingColor } = await supabase
                .from('colors')
                .select('id')
                .eq('name', colorName)
                .single();

              let colorId = existingColor?.id;

              if (!colorId) {
                const { data: newColor } = await supabase
                  .from('colors')
                  .insert({
                    name: colorName,
                    display_order: 999,
                    is_active: true
                  })
                  .select('id')
                  .single();
                colorId = newColor?.id;
              }
              
              if (colorId) colorIds.push(colorId);
            }
          }

          // Get or create sizes
          const sizeIds = [];
          if (productData.sizes && productData.sizes.length > 0) {
            for (const sizeName of productData.sizes) {
              const { data: existingSize } = await supabase
                .from('sizes')
                .select('id')
                .eq('name', sizeName)
                .single();

              let sizeId = existingSize?.id;

              if (!sizeId) {
                const { data: newSize } = await supabase
                  .from('sizes')
                  .insert({
                    name: sizeName,
                    category: 'clothing',
                    display_order: 999,
                    is_active: true
                  })
                  .select('id')
                  .single();
                sizeId = newSize?.id;
              }
              
              if (sizeId) sizeIds.push(sizeId);
            }
          }

          // Create product variants
          const variants = [];
          
          if (colorIds.length > 0 && sizeIds.length > 0) {
            for (const colorId of colorIds) {
              for (const sizeId of sizeIds) {
                variants.push({
                  product_id: productId,
                  color_id: colorId,
                  size_id: sizeId,
                  stock_quantity: Math.floor(productData.stock_quantity / (colorIds.length * sizeIds.length)),
                  additional_price: 0,
                  is_available: true
                });
              }
            }
          } else if (colorIds.length > 0) {
            for (const colorId of colorIds) {
              variants.push({
                product_id: productId,
                color_id: colorId,
                size_id: null,
                stock_quantity: Math.floor(productData.stock_quantity / colorIds.length),
                additional_price: 0,
                is_available: true
              });
            }
          } else if (sizeIds.length > 0) {
            for (const sizeId of sizeIds) {
              variants.push({
                product_id: productId,
                color_id: null,
                size_id: sizeId,
                stock_quantity: Math.floor(productData.stock_quantity / sizeIds.length),
                additional_price: 0,
                is_available: true
              });
            }
          }

          if (variants.length > 0) {
            const { error: variantError } = await supabase
              .from('product_variants')
              .insert(variants);

            if (variantError) {
              throw new Error(`Failed to update product variants: ${variantError.message}`);
            }
          }
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