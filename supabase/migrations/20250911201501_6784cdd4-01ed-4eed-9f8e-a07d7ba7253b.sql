-- Create optimized indexes for product_images table to fix slow query performance

-- Drop existing indexes if they exist to avoid conflicts
DROP INDEX IF EXISTS idx_product_images_product_id;
DROP INDEX IF EXISTS idx_product_images_display_order;

-- Create compound index for optimal product_images queries
-- This index covers the most common query pattern: WHERE product_id = ? ORDER BY display_order
CREATE INDEX idx_product_images_product_display 
ON public.product_images (product_id, display_order ASC);

-- Create covering index to avoid table lookups for common columns
CREATE INDEX idx_product_images_covering 
ON public.product_images (product_id) 
INCLUDE (display_order, image_url, is_primary, alt_text, created_at, updated_at);

-- Add index for primary image lookups (used in thumbnails)
CREATE INDEX idx_product_images_primary 
ON public.product_images (product_id, is_primary) 
WHERE is_primary = true;

-- Analyze table to update statistics after index creation
ANALYZE public.product_images;