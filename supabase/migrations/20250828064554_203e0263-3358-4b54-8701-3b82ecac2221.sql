-- Fix database performance with essential indexes and lightweight queries

-- 1. Create essential indexes for fast queries (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_products_category_active_created 
ON products (category, is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active_created 
ON products (is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_created_id 
ON products (created_at DESC, id);

-- 2. Replace the complex get_products_optimized with a simple lightweight version
DROP FUNCTION IF EXISTS public.get_products_optimized(text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_products_lightweight(
  p_category text DEFAULT 'all',
  p_limit integer DEFAULT 20,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  price numeric,
  category text,
  thumbnail_image text,
  stock_quantity integer,
  new_arrival_date timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    CASE 
      WHEN p.images IS NOT NULL AND array_length(p.images, 1) > 0 
      THEN p.images[COALESCE(p.thumbnail_index, 0) + 1] 
      ELSE null 
    END as thumbnail_image,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at
  FROM public.products p
  WHERE p.is_active = true
    AND (p_category = 'all' OR p.category = p_category)
    AND (
      p_cursor_created_at IS NULL OR 
      p.created_at < p_cursor_created_at OR 
      (p.created_at = p_cursor_created_at AND p.id < p_cursor_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT p_limit;
$$;

-- 3. Create simple function for categories
CREATE OR REPLACE FUNCTION public.get_categories_fast()
RETURNS TABLE(category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.category
  FROM public.products p
  WHERE p.is_active = true
  ORDER BY p.category;
$$;