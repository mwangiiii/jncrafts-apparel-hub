-- Performance Optimization: Add database indexes for faster queries
-- These indexes will dramatically improve query performance

-- Index on products for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created 
ON products (is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active 
ON products (category, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_new_arrival 
ON products (new_arrival_date DESC) 
WHERE new_arrival_date IS NOT NULL AND is_active = true;

-- Index for featured products join
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homepage_featured_active_order 
ON homepage_featured (is_active, display_order) 
WHERE is_active = true;

-- Index for cart operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_session 
ON cart_items (user_id, session_id, created_at DESC);

-- Index for wishlist operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishlist_user_created 
ON wishlist_items (user_id, created_at DESC);

-- Index for orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_created 
ON orders (user_id, created_at DESC);

-- Index for conversations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_updated 
ON conversations (user_id, updated_at DESC);

-- Partial index for stock alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_alerts_unnotified 
ON stock_alerts (product_id, user_id) 
WHERE notified = false;