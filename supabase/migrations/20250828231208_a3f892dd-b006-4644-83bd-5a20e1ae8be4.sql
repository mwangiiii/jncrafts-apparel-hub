-- Update functions with proper search_path (materialized view security is handled by access pattern)

-- 1. Update ultra-fast products function with explicit schema qualification
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
    FROM public.mv_products_landing pl
    WHERE (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- 2. Update featured products function
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
    FROM public.homepage_featured hf
    JOIN public.mv_products_landing pl ON pl.id = hf.product_id
    WHERE hf.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT p_limit;
$$;