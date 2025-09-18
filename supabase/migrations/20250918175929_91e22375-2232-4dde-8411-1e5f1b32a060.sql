-- Fix 403 error on get_products_ultra_fast function
-- The function needs SECURITY DEFINER to access materialized view without RLS restrictions

CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
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
    WHERE pl.is_active = true
      AND (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;