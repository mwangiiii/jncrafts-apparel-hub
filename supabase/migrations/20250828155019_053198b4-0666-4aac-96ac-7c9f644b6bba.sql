-- Create essential index for products query performance
-- This supports filtering by is_active and ordering by created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_products_active_created_id ON products(is_active, created_at DESC, id DESC);

-- Also create an index for category filtering with the same ordering
CREATE INDEX IF NOT EXISTS idx_products_category_created_id ON products(category, is_active, created_at DESC, id DESC);

-- Create index for product name searches (used in admin and search functionality)
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING GIN(to_tsvector('english', name));