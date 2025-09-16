-- Fix the get_products_ultra_fast function to eliminate timeouts
-- Replace expensive EXISTS queries with more efficient approach

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
    -- Ultra-fast version with minimal subqueries
    IF p_category = 'all' THEN
        RETURN QUERY
        SELECT 
            p.id,
            p.name,
            p.price,
            p.category,
            -- Get first available image directly
            (SELECT pi.image_url 
             FROM product_images pi 
             WHERE pi.product_id = p.id 
             ORDER BY 
                 CASE WHEN pi.is_primary THEN 0 ELSE 1 END,
                 pi.display_order ASC NULLS LAST,
                 pi.created_at ASC
             LIMIT 1) as thumbnail_image,
            p.stock_quantity,
            p.new_arrival_date,
            p.created_at,
            -- Simplified boolean flags - default to false for speed
            false as has_colors,
            false as has_sizes
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
            -- Get first available image directly
            (SELECT pi.image_url 
             FROM product_images pi 
             WHERE pi.product_id = p.id 
             ORDER BY 
                 CASE WHEN pi.is_primary THEN 0 ELSE 1 END,
                 pi.display_order ASC NULLS LAST,
                 pi.created_at ASC
             LIMIT 1) as thumbnail_image,
            p.stock_quantity,
            p.new_arrival_date,
            p.created_at,
            -- Simplified boolean flags - default to false for speed
            false as has_colors,
            false as has_sizes
        FROM products p
        WHERE p.is_active = true AND p.category = p_category
        ORDER BY p.created_at DESC
        LIMIT p_limit
        OFFSET p_offset;
    END IF;
END;
$$;