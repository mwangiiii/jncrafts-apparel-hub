-- Fix materialized view and function issues causing 500 errors

-- First drop the problematic materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.mv_products_landing CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_admin_products CASCADE;

-- Create a working materialized view for products landing with proper permissions
CREATE MATERIALIZED VIEW public.mv_products_landing AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at,
    p.is_active,
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
     LIMIT 1) as thumbnail_image,
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id) as has_sizes
FROM products p
WHERE p.is_active = true;

-- Create index for better performance
CREATE UNIQUE INDEX ON public.mv_products_landing (id);
CREATE INDEX ON public.mv_products_landing (category);
CREATE INDEX ON public.mv_products_landing (created_at DESC);

-- Grant permissions to anon and authenticated users
GRANT SELECT ON public.mv_products_landing TO anon;
GRANT SELECT ON public.mv_products_landing TO authenticated;

-- Create admin products materialized view
CREATE MATERIALIZED VIEW public.mv_admin_products AS
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
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
     LIMIT 1) as thumbnail_image,
    (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) as total_images,
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id) as has_sizes,
    (SELECT COUNT(*) FROM product_colors pc WHERE pc.product_id = p.id) as colors_count,
    (SELECT COUNT(*) FROM product_sizes ps WHERE ps.product_id = p.id) as sizes_count
FROM products p;

-- Create index for admin products
CREATE UNIQUE INDEX ON public.mv_admin_products (id);
CREATE INDEX ON public.mv_admin_products (created_at DESC);

-- Grant admin permissions
GRANT SELECT ON public.mv_admin_products TO authenticated;

-- Fix get_products_ultra_fast function to avoid timeouts
CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
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
STABLE SECURITY INVOKER
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
    WHERE pl.is_active = true
      AND (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Fix get_featured_products_ultra_fast function
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
STABLE SECURITY INVOKER
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
      AND pl.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT p_limit;
$$;

-- Update the refresh functions
CREATE OR REPLACE FUNCTION public.refresh_products_landing_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_products_landing;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_admin_products_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_admin_products;
END;
$$;