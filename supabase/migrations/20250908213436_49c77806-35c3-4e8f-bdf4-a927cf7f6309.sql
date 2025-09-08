-- Optimize cart_items_with_details view and add performance indexes

-- Add critical indexes for cart operations
CREATE INDEX IF NOT EXISTS idx_cart_items_user_created_desc 
ON cart_items(user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cart_items_product_color_size 
ON cart_items(product_id, color_id, size_id);

-- Add indexes for the JOINs in the view
CREATE INDEX IF NOT EXISTS idx_products_active_id 
ON products(id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_colors_id_name 
ON colors(id, name, hex_code);

CREATE INDEX IF NOT EXISTS idx_sizes_id_name_category 
ON sizes(id, name, category);

-- Critical index for product image lookup performance
CREATE INDEX IF NOT EXISTS idx_product_images_primary_lookup 
ON product_images(product_id, is_primary DESC, display_order, created_at) 
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_product_images_fallback_lookup 
ON product_images(product_id, display_order, created_at);

-- Drop and recreate the view with optimized query
DROP VIEW IF EXISTS cart_items_with_details;

-- Optimized view using LEFT JOIN instead of correlated subquery
CREATE VIEW cart_items_with_details AS
WITH primary_images AS (
  SELECT DISTINCT ON (product_id) 
    product_id,
    image_url
  FROM product_images
  ORDER BY product_id, is_primary DESC, display_order NULLS LAST, created_at
)
SELECT 
  ci.id,
  ci.user_id,
  ci.session_id,
  ci.product_id,
  ci.color_id,
  ci.size_id,
  ci.quantity,
  ci.price,
  ci.created_at,
  ci.updated_at,
  p.name AS product_name,
  p.description AS product_description,
  p.category AS product_category,
  pi.image_url AS product_image,
  c.name AS color_name,
  c.hex_code AS color_hex,
  s.name AS size_name,
  s.category AS size_category
FROM cart_items ci
INNER JOIN products p ON ci.product_id = p.id AND p.is_active = true
INNER JOIN colors c ON ci.color_id = c.id
INNER JOIN sizes s ON ci.size_id = s.id
LEFT JOIN primary_images pi ON p.id = pi.product_id;

-- Add a comment explaining the optimization
COMMENT ON VIEW cart_items_with_details IS 'Optimized cart view using CTE for primary images instead of correlated subquery';