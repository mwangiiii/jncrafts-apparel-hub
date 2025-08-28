-- Create specialized indexes for ultra-fast thumbnail loading (non-concurrent for migration compatibility)

-- 1. Index for thumbnail queries (display_order = 1)
DROP INDEX IF EXISTS idx_product_images_thumbnail;
CREATE INDEX idx_product_images_thumbnail 
ON product_images (product_id, display_order) 
WHERE display_order = 1 AND image_url IS NOT NULL;

-- 2. Composite index for active products
DROP INDEX IF EXISTS idx_products_active_created;
CREATE INDEX idx_products_active_created 
ON products (is_active, created_at DESC, category) 
WHERE is_active = true;

-- 3. Index for product variants
CREATE INDEX IF NOT EXISTS idx_product_colors_available 
ON product_colors (product_id) 
WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_product_sizes_available 
ON product_sizes (product_id) 
WHERE is_available = true;