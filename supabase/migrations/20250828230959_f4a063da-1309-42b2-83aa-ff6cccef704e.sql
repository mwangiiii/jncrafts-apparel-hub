-- Performance optimization for ultra-fast thumbnail loading

-- 1. Create specialized indexes for thumbnail queries (display_order = 1)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_thumbnail 
ON product_images (product_id, display_order) 
WHERE display_order = 1 AND image_url IS NOT NULL;

-- 2. Create composite index for active products with thumbnails
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created 
ON products (is_active, created_at DESC, category) 
WHERE is_active = true;

-- 3. Create materialized view for ultra-fast landing page queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_products_landing AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at,
    pi.image_url as thumbnail_image,
    -- Performance flags
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id AND pc.is_available = true) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id AND ps.is_available = true) as has_sizes
FROM products p
LEFT JOIN product_images pi ON (
    pi.product_id = p.id 
    AND pi.display_order = 1
)
WHERE p.is_active = true
ORDER BY p.created_at DESC;

-- 4. Create unique index on materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_products_landing_id ON mv_products_landing (id);
CREATE INDEX IF NOT EXISTS idx_mv_products_landing_category ON mv_products_landing (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mv_products_landing_created ON mv_products_landing (created_at DESC);

-- 5. Create function to refresh materialized view efficiently
CREATE OR REPLACE FUNCTION refresh_products_landing_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_products_landing;
END;
$$;

-- 6. Create trigger to auto-refresh materialized view on product changes
CREATE OR REPLACE FUNCTION trigger_refresh_products_landing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh in background to avoid blocking
    PERFORM pg_notify('refresh_products_landing', '');
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for auto-refresh
DROP TRIGGER IF EXISTS trigger_products_landing_refresh ON products;
CREATE TRIGGER trigger_products_landing_refresh
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_products_landing();

DROP TRIGGER IF EXISTS trigger_product_images_landing_refresh ON product_images;
CREATE TRIGGER trigger_product_images_landing_refresh
    AFTER INSERT OR UPDATE OR DELETE ON product_images
    FOR EACH ROW
    WHEN (NEW.display_order = 1 OR OLD.display_order = 1 OR NEW.display_order IS NULL OR OLD.display_order IS NULL)
    EXECUTE FUNCTION trigger_refresh_products_landing();

-- 7. Create ultra-fast thumbnail-only function
CREATE OR REPLACE FUNCTION get_products_ultra_fast(
    p_category text DEFAULT 'all',
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    name text,
    price numeric,
    category text,
    thumbnail_image text,
    stock_quantity integer,
    new_arrival_date timestamp with time zone,
    created_at timestamp with time zone,
    has_colors boolean,
    has_sizes boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        pl.id,
        pl.name,
        pl.price,
        pl.category,
        pl.thumbnail_image,
        pl.stock_quantity,
        pl.new_arrival_date,
        pl.created_at,
        pl.has_colors,
        pl.has_sizes
    FROM mv_products_landing pl
    WHERE (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 8. Create function for featured products with thumbnails
CREATE OR REPLACE FUNCTION get_featured_products_ultra_fast(p_limit integer DEFAULT 6)
RETURNS TABLE(
    id uuid,
    display_order integer,
    product_id uuid,
    name text,
    price numeric,
    category text,
    thumbnail_image text,
    stock_quantity integer,
    new_arrival_date timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        hf.id,
        hf.display_order,
        hf.product_id,
        pl.name,
        pl.price,
        pl.category,
        pl.thumbnail_image,
        pl.stock_quantity,
        pl.new_arrival_date
    FROM homepage_featured hf
    JOIN mv_products_landing pl ON pl.id = hf.product_id
    WHERE hf.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT p_limit;
$$;

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW mv_products_landing;