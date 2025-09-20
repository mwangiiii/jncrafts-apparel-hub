-- Create a more reliable and simpler products function without CONCURRENTLY indexes
CREATE OR REPLACE FUNCTION public.get_products_ultra_fast_v2(
  p_category text DEFAULT 'all'::text, 
  p_limit integer DEFAULT 50, 
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
SET statement_timeout TO '5s'
AS $function$
  WITH primary_images AS (
    SELECT DISTINCT ON (product_id) 
      product_id,
      image_url
    FROM product_images
    ORDER BY product_id, is_primary DESC, display_order ASC, created_at ASC
  )
  SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    COALESCE(pi.image_url, '') as thumbnail_image,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at,
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id AND pc.is_available = true) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id AND ps.is_available = true) as has_sizes
  FROM products p
  LEFT JOIN primary_images pi ON p.id = pi.product_id
  WHERE p.is_active = true
    AND (p_category = 'all' OR p.category = p_category)
  ORDER BY 
    CASE WHEN p_category = 'all' THEN p.category END ASC,
    p.created_at DESC
  LIMIT LEAST(p_limit, 50)
  OFFSET GREATEST(0, p_offset);
$function$;

-- Replace the old function with the new one
DROP FUNCTION IF EXISTS public.get_products_ultra_fast(text, integer, integer);

-- Recreate with new implementation
CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(
  p_category text DEFAULT 'all'::text, 
  p_limit integer DEFAULT 50, 
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
SET statement_timeout TO '5s'
AS $function$
  SELECT * FROM public.get_products_ultra_fast_v2(p_category, p_limit, p_offset);
$function$;