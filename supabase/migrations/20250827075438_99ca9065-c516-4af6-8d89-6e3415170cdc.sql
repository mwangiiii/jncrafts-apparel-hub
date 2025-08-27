-- Add indexes for better performance on products table
CREATE INDEX IF NOT EXISTS idx_products_active_category 
ON public.products (is_active, category) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active_created 
ON public.products (is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_new_arrival 
ON public.products (new_arrival_date DESC) 
WHERE new_arrival_date IS NOT NULL;

-- Add function to get products with optimized query
CREATE OR REPLACE FUNCTION public.get_products_optimized(
  p_category text DEFAULT 'all',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  category text,
  thumbnail_image text,
  sizes text[],
  colors text[],
  stock_quantity integer,
  new_arrival_date timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    CASE 
      WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
      THEN p.images[1] 
      ELSE null 
    END as thumbnail_image,
    p.sizes,
    p.colors,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at
  FROM public.products p
  WHERE p.is_active = true
    AND (p_category = 'all' OR p.category = p_category)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;