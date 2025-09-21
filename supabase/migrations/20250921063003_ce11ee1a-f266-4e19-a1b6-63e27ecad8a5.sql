-- Add thumbnail_image_id column to cart_items table as FK to product_images
ALTER TABLE public.cart_items 
ADD COLUMN thumbnail_image_id uuid REFERENCES public.product_images(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_thumbnail_image 
ON public.cart_items(thumbnail_image_id);

-- Drop the cart_items_with_details view/table
DROP VIEW IF EXISTS public.cart_items_with_details CASCADE;