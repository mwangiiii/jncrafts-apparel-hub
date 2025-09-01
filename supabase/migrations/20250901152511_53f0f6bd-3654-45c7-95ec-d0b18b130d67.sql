-- FORCE FIX: Security Issues - Part 3 (Remove Materialized View from API)

-- Remove materialized view access from API by revoking permissions
REVOKE ALL ON mv_admin_products FROM anon;
REVOKE ALL ON mv_admin_products FROM authenticated;

-- Ensure only functions can access it
GRANT SELECT ON mv_admin_products TO postgres;

-- Update RLS on products table to fix admin access
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Admins can update products" 
ON public.products 
FOR UPDATE 
USING (is_admin(auth.uid())) 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete products" 
ON public.products 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Ensure all admin functions have proper search path
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(
    p_limit integer DEFAULT 8, 
    p_offset integer DEFAULT 0
)
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
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    -- ULTRA-FAST: Use materialized view for instant admin access (SECURITY DEFINER only)
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
    FROM mv_admin_products map
    WHERE is_admin(auth.uid()) -- Admin check in function
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$function$;