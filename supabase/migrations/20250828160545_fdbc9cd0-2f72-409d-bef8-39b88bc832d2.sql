-- Additional performance indexes for products and cart items

-- Products table indexes with partial indexing for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created 
ON products(is_active, created_at DESC, id DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_name 
ON products(is_active, name ASC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active 
ON products(category, is_active) 
WHERE is_active = true;

-- Cart items index for user-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_created 
ON cart_items(user_id, created_at DESC);