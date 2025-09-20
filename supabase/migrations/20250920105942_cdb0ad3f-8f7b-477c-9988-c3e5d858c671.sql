-- Update the ultra-fast products function to only return active products for client-side
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
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET enable_seqscan TO 'off'
SET work_mem TO '64MB'
SET statement_timeout TO '2s'
AS $function$
BEGIN
    -- For client-facing requests, only show active products
    -- Use different strategies based on category
    IF p_category = 'all' THEN
        RETURN QUERY 
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
        ORDER BY pl.created_at DESC, pl.category ASC
        LIMIT LEAST(p_limit, 50)
        OFFSET GREATEST(0, p_offset);
    ELSE
        RETURN QUERY 
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
          AND pl.category = p_category
        ORDER BY pl.created_at DESC
        LIMIT LEAST(p_limit, 50)
        OFFSET GREATEST(0, p_offset);
    END IF;
END;
$function$;