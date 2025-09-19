-- COMPLETE THE REMAINING OPTIMIZATIONS

-- Replace get_products_ultra_fast with ultra-simplified version
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
SET enable_seqscan TO 'off'
SET work_mem TO '64MB'
SET statement_timeout TO '2s'
AS $function$
BEGIN
    -- Use different strategies based on category
    IF p_category = 'all' THEN
        RETURN QUERY 
        SELECT * FROM public.get_products_minimal(p_limit, p_offset);
    ELSE
        RETURN QUERY 
        SELECT * FROM public.get_products_by_category_fast(p_category, p_limit, p_offset);
    END IF;
END;
$function$;

-- Update featured products with simpler logic
DROP FUNCTION IF EXISTS public.get_featured_products_ultra_fast(integer);
CREATE OR REPLACE FUNCTION public.get_featured_products_ultra_fast(p_limit integer DEFAULT 6)
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
SET enable_seqscan TO 'off'
SET statement_timeout TO '1s'
AS $function$
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
    FROM public.homepage_featured hf
    JOIN public.mv_products_landing pl ON pl.id = hf.product_id
    WHERE hf.is_active = true
      AND pl.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT LEAST(p_limit, 8);
$function$;

-- Refresh materialized views and analyze
REFRESH MATERIALIZED VIEW public.mv_products_landing;
REFRESH MATERIALIZED VIEW public.mv_admin_products;

-- Update statistics for optimal query planning
ANALYZE public.mv_products_landing;
ANALYZE public.mv_admin_products;
ANALYZE public.products;
ANALYZE public.product_images;
ANALYZE public.homepage_featured;