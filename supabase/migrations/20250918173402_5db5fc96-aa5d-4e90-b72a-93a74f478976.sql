-- Fix security definer and materialized view API exposure issues

-- Remove API access to materialized views for security
REVOKE ALL ON public.mv_products_landing FROM anon;
REVOKE ALL ON public.mv_products_landing FROM authenticated;
REVOKE ALL ON public.mv_admin_products FROM anon; 
REVOKE ALL ON public.mv_admin_products FROM authenticated;

-- Materialized views should not be directly accessible via API
-- Functions will access them with proper security checks

-- Fix any remaining SECURITY DEFINER functions that don't need it
DROP FUNCTION IF EXISTS public.refresh_products_landing_view();
CREATE OR REPLACE FUNCTION public.refresh_products_landing_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This one legitimately needs DEFINER for refresh permissions
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_products_landing;
END;
$$;

DROP FUNCTION IF EXISTS public.refresh_admin_products_view();
CREATE OR REPLACE FUNCTION public.refresh_admin_products_view()
RETURNS void
LANGUAGE plpgsql  
SECURITY DEFINER  -- This one legitimately needs DEFINER for refresh permissions
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_admin_products;
END;
$$;

-- Fix the admin products function to properly check permissions
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
RETURNS TABLE(
    id uuid, 
    name text, 
    price numeric, 
    category text, 
    description text, 
    stock_quantity integer, 
    is_active boolean, 
    new_arrival_date timestamp with time zone, 
    thumbnail_index integer, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    thumbnail_image text, 
    total_images integer, 
    has_colors boolean, 
    has_sizes boolean, 
    colors_count integer, 
    sizes_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    -- Check if user is admin first
    IF NOT public.is_admin(auth.uid()) THEN
        RETURN;
    END IF;
    
    -- Return admin product data
    RETURN QUERY
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
END;
$$;