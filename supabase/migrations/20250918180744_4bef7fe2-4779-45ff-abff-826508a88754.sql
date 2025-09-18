-- Fix all three database issues: permissions on materialized views and timeouts
-- 1. Fix permissions on materialized views
-- 2. Make functions SECURITY DEFINER to bypass RLS
-- 3. Optimize functions to prevent timeouts

-- Grant permissions on materialized views
GRANT SELECT ON public.mv_admin_products TO authenticator;
GRANT SELECT ON public.mv_products_landing TO authenticator;

-- Fix get_admin_products_ultra_fast with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, name text, price numeric, category text, description text, stock_quantity integer, is_active boolean, new_arrival_date timestamp with time zone, thumbnail_index integer, created_at timestamp with time zone, updated_at timestamp with time zone, thumbnail_image text, total_images integer, has_colors boolean, has_sizes boolean, colors_count integer, sizes_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    FROM public.mv_admin_products map
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Fix get_featured_products_ultra_fast with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_featured_products_ultra_fast(p_limit integer DEFAULT 6)
RETURNS TABLE(id uuid, display_order integer, product_id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone)
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
      AND pl.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT p_limit;
$$;