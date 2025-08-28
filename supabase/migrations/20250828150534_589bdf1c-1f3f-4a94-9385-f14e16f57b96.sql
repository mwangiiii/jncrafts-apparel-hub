-- Create composite indexes to optimize products queries and eliminate timeouts

-- Index for the main products query (is_active + ordering by created_at, id)
CREATE INDEX IF NOT EXISTS idx_products_active_created_id 
ON products(is_active, created_at DESC, id DESC) 
WHERE is_active = true;

-- Index for category filtering with ordering
CREATE INDEX IF NOT EXISTS idx_products_active_category_created 
ON products(is_active, category, created_at DESC, id DESC) 
WHERE is_active = true;

-- Index for stock quantity checks (used in stock alerts)
CREATE INDEX IF NOT EXISTS idx_products_active_stock 
ON products(is_active, stock_quantity) 
WHERE is_active = true;

-- Index for new arrivals filtering
CREATE INDEX IF NOT EXISTS idx_products_active_new_arrival 
ON products(is_active, new_arrival_date DESC) 
WHERE is_active = true AND new_arrival_date IS NOT NULL;