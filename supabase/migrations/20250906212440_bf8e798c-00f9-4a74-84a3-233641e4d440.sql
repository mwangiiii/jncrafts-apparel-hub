-- Add performance indexes for get_product_complete function (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_product_images_product_id_display_order 
ON product_images(product_id, display_order, created_at);

CREATE INDEX IF NOT EXISTS idx_product_colors_product_id 
ON product_colors(product_id);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id 
ON product_sizes(product_id);

CREATE INDEX IF NOT EXISTS idx_colors_display_order 
ON colors(display_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sizes_display_order 
ON sizes(display_order) WHERE is_active = true;