-- Fix security warnings for functions and materialized view

-- 1. Recreate functions with proper search_path and security
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

-- 2. Recreate featured products function with proper security
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

-- 3. Update refresh function with proper security
CREATE OR REPLACE FUNCTION refresh_products_landing_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_products_landing;
END;
$$;

-- 4. Add RLS policy to materialized view to control API access
ALTER MATERIALIZED VIEW mv_products_landing ENABLE ROW LEVEL SECURITY;

-- Allow public read access to the materialized view (it only contains public product data)
CREATE POLICY "Public read access to product landing data" 
ON mv_products_landing FOR SELECT 
USING (true);