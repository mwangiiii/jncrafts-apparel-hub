-- Fix the get_products_ultra_fast function to handle timeouts better
-- Drop and recreate the function with better performance

DROP FUNCTION IF EXISTS public.get_products_ultra_fast(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(
    p_category text DEFAULT 'all'::text, 
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
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Use a simpler query that avoids potential timeout issues
    IF p_category = 'all' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            p.category,
            (SELECT pi.image_url 
             FROM product_images pi 
             WHERE pi.product_id = p.id 
             ORDER BY pi.is_primary DESC, pi.display_order ASC 
             LIMIT 1) as thumbnail_image,
            p.stock_quantity,
            p.new_arrival_date,
            p.created_at,
            EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
            EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes
        FROM products p
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    ELSE
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            p.category,
            (SELECT pi.image_url 
             FROM product_images pi 
             WHERE pi.product_id = p.id 
             ORDER BY pi.is_primary DESC, pi.display_order ASC 
             LIMIT 1) as thumbnail_image,
            p.stock_quantity,
            p.new_arrival_date,
            p.created_at,
            EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
            EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes
        FROM products p
        WHERE p.is_active = true AND p.category = p_category
        ORDER BY p.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$;

-- Also refresh the materialized view to ensure it's up to date
REFRESH MATERIALIZED VIEW public.mv_products_landing;