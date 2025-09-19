-- FORCE REFRESH MATERIALIZED VIEWS AND ULTRA-AGGRESSIVE OPTIMIZATIONS
REFRESH MATERIALIZED VIEW public.mv_products_landing;
REFRESH MATERIALIZED VIEW public.mv_admin_products;

-- Drop and recreate get_products_ultra_fast with EXTREME optimizations
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
SET enable_seqscan TO 'off'
SET work_mem TO '256MB'
SET statement_timeout TO '5s'
AS $function$
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
    FROM public.mv_products_landing pl
    WHERE pl.is_active = true
      AND (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT LEAST(p_limit, 50)  -- Cap at 50 for ultra speed
    OFFSET GREATEST(0, p_offset);
$function$;

-- Create ULTRA-OPTIMIZED backup function that bypasses materialized view if needed
CREATE OR REPLACE FUNCTION public.get_products_direct_fast(
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
SET enable_seqscan TO 'off'
SET work_mem TO '128MB'
SET statement_timeout TO '3s'
AS $function$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND display_order = 1 LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        false as has_colors,
        false as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC
    LIMIT LEAST(p_limit, 30)  -- Even smaller limit for direct query
    OFFSET GREATEST(0, p_offset);
$function$;

-- Update get_featured_products_ultra_fast with timeout protection
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
SET statement_timeout TO '3s'
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
    LIMIT LEAST(p_limit, 10);  -- Cap featured products
$function$;

-- Force update statistics for better query planning
ANALYZE public.mv_products_landing;
ANALYZE public.mv_admin_products;
ANALYZE public.products;
ANALYZE public.product_images;
ANALYZE public.homepage_featured;