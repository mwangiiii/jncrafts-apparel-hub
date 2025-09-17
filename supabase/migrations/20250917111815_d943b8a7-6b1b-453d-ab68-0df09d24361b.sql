-- Fix thumbnail display in get_products_ultra_fast function
-- Add efficient thumbnail lookup from product_images table

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
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    -- Ultra-fast version with efficient thumbnail lookup
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        -- Efficient single thumbnail lookup
        (SELECT pi.image_url 
         FROM product_images pi 
         WHERE pi.product_id = p.id 
         ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
         LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        false as has_colors, -- Static values for speed
        false as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;