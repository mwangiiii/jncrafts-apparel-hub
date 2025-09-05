import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProductFormData {
  name: string;
  price: number;
  description?: string;
  category: string;
  images: string[];
  videos?: string[];
  thumbnailIndex: number;
  sizes: string[];
  colors: string[];
  stock_quantity: number;
  is_active: boolean;
  show_jacket_size_chart?: boolean;
  show_pants_size_chart?: boolean;
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
      
      // Start transaction-like approach
      try {
        // 1. First create the main product
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: productData.category,
            stock_quantity: productData.stock_quantity,
            is_active: productData.is_active,
            new_arrival_date: null, // Can be set later if needed
            thumbnail_index: productData.thumbnailIndex || 0,
            show_jacket_size_chart: productData.show_jacket_size_chart || false,
            show_pants_size_chart: productData.show_pants_size_chart || false
          })
          .select()
          .single();

        if (productError) {
          console.error('❌ Product creation failed:', productError);
          throw new Error(`Failed to create product: ${productError.message}`);
        }

        console.log('✅ Main product created:', product.id);

        // 2. Handle images
        if (productData.images && productData.images.length > 0) {
          const imagePromises = productData.images.map((imageUrl, index) => 
            supabase
              .from('product_images')
              .insert({
                product_id: product.id,
                image_url: imageUrl,
                alt_text: `${productData.name} image ${index + 1}`,
                display_order: index,
                is_primary: index === (productData.thumbnailIndex || 0)
              })
          );

          const imageResults = await Promise.all(imagePromises);
          const imageErrors = imageResults.filter(result => result.error);
          
          if (imageErrors.length > 0) {
            console.error('⚠️ Some images failed to save:', imageErrors);
            toast({
              title: "Warning",
              description: `Product created but ${imageErrors.length} images failed to save`,
              variant: "destructive"
            });
          } else {
            console.log('✅ All images saved successfully');
          }
        }

        // 3. Handle colors
        if (productData.colors && productData.colors.length > 0) {
          // First, ensure colors exist in colors table
          for (const colorName of productData.colors) {
            const { data: existingColor } = await supabase
              .from('colors')
              .select('id')
              .eq('name', colorName)
              .single();

            let colorId = existingColor?.id;

            // If color doesn't exist, create it
            if (!colorId) {
              const { data: newColor, error: colorError } = await supabase
                .from('colors')
                .insert({
                  name: colorName,
                  display_order: 999, // Will be reordered later if needed
                  is_active: true
                })
                .select('id')
                .single();

              if (colorError) {
                console.error('❌ Failed to create color:', colorName, colorError);
                continue; // Skip this color and continue with others
              }
              colorId = newColor.id;
              console.log('✅ Created new color:', colorName);
            }

            // Link color to product
            const { error: productColorError } = await supabase
              .from('product_colors')
              .insert({
                product_id: product.id,
                color_id: colorId,
                stock_quantity: Math.floor(productData.stock_quantity / productData.colors.length),
                additional_price: 0,
                is_available: true
              });

            if (productColorError) {
              console.error('❌ Failed to link color to product:', colorName, productColorError);
            } else {
              console.log('✅ Linked color to product:', colorName);
            }
          }
        }

        // 4. Handle sizes
        if (productData.sizes && productData.sizes.length > 0) {
          // First, ensure sizes exist in sizes table
          for (const sizeName of productData.sizes) {
            const { data: existingSize } = await supabase
              .from('sizes')
              .select('id')
              .eq('name', sizeName)
              .single();

            let sizeId = existingSize?.id;

            // If size doesn't exist, create it
            if (!sizeId) {
              const { data: newSize, error: sizeError } = await supabase
                .from('sizes')
                .insert({
                  name: sizeName,
                  category: 'clothing', // Default category
                  display_order: 999, // Will be reordered later if needed
                  is_active: true
                })
                .select('id')
                .single();

              if (sizeError) {
                console.error('❌ Failed to create size:', sizeName, sizeError);
                continue; // Skip this size and continue with others
              }
              sizeId = newSize.id;
              console.log('✅ Created new size:', sizeName);
            }

            // Link size to product
            const { error: productSizeError } = await supabase
              .from('product_sizes')
              .insert({
                product_id: product.id,
                size_id: sizeId,
                stock_quantity: Math.floor(productData.stock_quantity / productData.sizes.length),
                additional_price: 0,
                is_available: true
              });

            if (productSizeError) {
              console.error('❌ Failed to link size to product:', sizeName, productSizeError);
            } else {
              console.log('✅ Linked size to product:', sizeName);
            }
          }
        }

        // 5. Refresh materialized views
        try {
          await supabase.rpc('refresh_admin_products_view');
          await supabase.rpc('refresh_products_landing_view');
          console.log('✅ Materialized views refreshed');
        } catch (viewError) {
          console.warn('⚠️ Failed to refresh materialized views:', viewError);
        }

        console.log('🎉 COMPLETE PRODUCT CREATION FINISHED SUCCESSFULLY');
        return product;

      } catch (error) {
        console.error('💥 COMPLETE PRODUCT CREATION FAILED:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-products-ultra-fast'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
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
        // 1. Update the main product
        const { error: productError } = await supabase
          .from('products')
          .update({
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: productData.category,
            stock_quantity: productData.stock_quantity,
            is_active: productData.is_active,
            thumbnail_index: productData.thumbnailIndex || 0,
            show_jacket_size_chart: productData.show_jacket_size_chart || false,
            show_pants_size_chart: productData.show_pants_size_chart || false
          })
          .eq('id', productId);

        if (productError) {
          throw new Error(`Failed to update product: ${productError.message}`);
        }

        console.log('✅ Main product updated');

        // 2. Clear existing images and recreate them
        await supabase.from('product_images').delete().eq('product_id', productId);
        
        if (productData.images && productData.images.length > 0) {
          const imagePromises = productData.images.map((imageUrl, index) => 
            supabase
              .from('product_images')
              .insert({
                product_id: productId,
                image_url: imageUrl,
                alt_text: `${productData.name} image ${index + 1}`,
                display_order: index,
                is_primary: index === (productData.thumbnailIndex || 0)
              })
          );

          await Promise.all(imagePromises);
          console.log('✅ Images updated');
        }

        // 3. Clear existing product colors and recreate them
        await supabase.from('product_colors').delete().eq('product_id', productId);
        
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

            if (colorId) {
              await supabase
                .from('product_colors')
                .insert({
                  product_id: productId,
                  color_id: colorId,
                  stock_quantity: Math.floor(productData.stock_quantity / productData.colors.length),
                  additional_price: 0,
                  is_available: true
                });
            }
          }
        }

        // 4. Clear existing product sizes and recreate them
        await supabase.from('product_sizes').delete().eq('product_id', productId);
        
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

            if (sizeId) {
              await supabase
                .from('product_sizes')
                .insert({
                  product_id: productId,
                  size_id: sizeId,
                  stock_quantity: Math.floor(productData.stock_quantity / productData.sizes.length),
                  additional_price: 0,
                  is_available: true
                });
            }
          }
        }

        // 5. Refresh materialized views
        try {
          await supabase.rpc('refresh_admin_products_view');
          await supabase.rpc('refresh_products_landing_view');
        } catch (viewError) {
          console.warn('⚠️ Failed to refresh materialized views:', viewError);
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