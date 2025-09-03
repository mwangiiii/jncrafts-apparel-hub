-- Fix security issues by updating functions to have proper search_path

-- Drop and recreate functions with proper search_path set to empty string for security
DROP FUNCTION IF EXISTS public.get_products_ultra_fast(text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
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
    WHERE (p_category = 'all' OR pl.category = p_category)
    ORDER BY pl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$function$;

-- Fix get_featured_products_ultra_fast
DROP FUNCTION IF EXISTS public.get_featured_products_ultra_fast(integer);
CREATE OR REPLACE FUNCTION public.get_featured_products_ultra_fast(p_limit integer DEFAULT 6)
 RETURNS TABLE(id uuid, display_order integer, product_id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
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
    ORDER BY hf.display_order ASC
    LIMIT p_limit;
$function$;

-- Fix get_admin_products_ultra_fast
DROP FUNCTION IF EXISTS public.get_admin_products_ultra_fast(integer, integer);
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, price numeric, category text, description text, stock_quantity integer, is_active boolean, new_arrival_date timestamp with time zone, thumbnail_index integer, created_at timestamp with time zone, updated_at timestamp with time zone, thumbnail_image text, total_images integer, has_colors boolean, has_sizes boolean, colors_count integer, sizes_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
    -- Admin check and return data
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
    WHERE public.is_admin(auth.uid()) -- Admin check in function
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$function$;

-- Fix other critical functions
DROP FUNCTION IF EXISTS public.get_categories_fast();
CREATE OR REPLACE FUNCTION public.get_categories_fast()
 RETURNS TABLE(category text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT DISTINCT p.category
  FROM public.products p
  WHERE p.is_active = true
  ORDER BY p.category;
$function$;

-- Fix refresh functions
DROP FUNCTION IF EXISTS public.refresh_products_landing_view();
CREATE OR REPLACE FUNCTION public.refresh_products_landing_view()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_products_landing;
END;
$function$;

DROP FUNCTION IF EXISTS public.refresh_admin_products_view();
CREATE OR REPLACE FUNCTION public.refresh_admin_products_view()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW public.mv_admin_products;
END;
$function$;