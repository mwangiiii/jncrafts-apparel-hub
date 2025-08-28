-- Additional performance indexes for products and cart items
-- Note: CONCURRENTLY removed as it cannot run in migration transactions

-- Products table indexes with partial indexing for better performance
CREATE INDEX IF NOT EXISTS idx_products_active_created 
ON products(is_active, created_at DESC, id DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active_name 
ON products(is_active, name ASC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_category_active 
ON products(category, is_active) 
WHERE is_active = true;

-- Cart items index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_cart_items_user_created 
ON cart_items(user_id, created_at DESC);