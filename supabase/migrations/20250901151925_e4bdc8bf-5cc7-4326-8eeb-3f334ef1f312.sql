-- FORCE FIX: Complete Admin Products Panel Optimization

-- 1. Fix guest_sessions RLS policy to allow system inserts
DROP POLICY IF EXISTS "Allow creating guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Allow system to create guest sessions" ON public.guest_sessions;

CREATE POLICY "System can manage guest sessions" 
ON public.guest_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Add critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_admin_list ON public.products(created_at DESC, id DESC) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary DESC, display_order ASC) WHERE is_primary = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_count ON public.product_images(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_colors_exists ON public.product_colors(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_sizes_exists ON public.product_sizes(product_id);

-- 3. Create ultra-fast materialized view for admin products
DROP MATERIALIZED VIEW IF EXISTS mv_admin_products CASCADE;

CREATE MATERIALIZED VIEW mv_admin_products AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    p.description,
    p.stock_quantity,
    p.is_active,
    p.new_arrival_date,
    p.thumbnail_index,
    p.created_at,
    p.updated_at,
    -- Get primary image efficiently
    COALESCE(
        (SELECT pi.image_url 
         FROM product_images pi 
         WHERE pi.product_id = p.id 
         ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
         LIMIT 1),
        ''
    ) as thumbnail_image,
    -- Count images efficiently
    COALESCE((SELECT COUNT(*) FROM product_images WHERE product_id = p.id), 0) as total_images,
    -- Quick boolean checks
    EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes,
    -- Count variants
    COALESCE((SELECT COUNT(*) FROM product_colors WHERE product_id = p.id), 0) as colors_count,
    COALESCE((SELECT COUNT(*) FROM product_sizes WHERE product_id = p.id), 0) as sizes_count
FROM products p
ORDER BY p.created_at DESC, p.id DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_mv_admin_products_id ON mv_admin_products(id);
CREATE INDEX idx_mv_admin_products_created_at ON mv_admin_products(created_at DESC, id DESC);

-- 4. Update the database function to use materialized view
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(
    p_limit integer DEFAULT 50, 
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid, 
    name text, 
    price numeric, 
    category text, 
    description text, 
    stock_quantity integer, 
    is_active boolean, 
    new_arrival_date timestamp with time zone, 
    thumbnail_index integer, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    thumbnail_image text, 
    total_images integer, 
    has_colors boolean, 
    has_sizes boolean, 
    colors_count integer, 
    sizes_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    -- ULTRA-FAST: Use materialized view for instant admin access
    SELECT 
        map.id,
        map.name,
        map.price,
        map.category,
        map.description,
        map.stock_quantity,
        map.is_active,
        map.new_arrival_date,
        map.thumbnail_index,
        map.created_at,
        map.updated_at,
        map.thumbnail_image,
        map.total_images::integer,
        map.has_colors,
        map.has_sizes,
        map.colors_count::integer,
        map.sizes_count::integer
    FROM mv_admin_products map
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$function$;

-- 5. Create function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_admin_products_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_products;
END;
$function$;

-- 6. Grant necessary permissions
GRANT SELECT ON mv_admin_products TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_admin_products_view() TO authenticated;