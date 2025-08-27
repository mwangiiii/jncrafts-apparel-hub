-- Add indexes for better performance on products table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_category 
ON public.products (is_active, category) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created 
ON public.products (is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_new_arrival 
ON public.products (new_arrival_date DESC) 
WHERE new_arrival_date IS NOT NULL;

-- Optimize the products table by adding a materialized view for faster queries
CREATE MATERIALIZED VIEW IF NOT EXISTS public.products_optimized AS
SELECT 
  id,
  name,
  price,
  category,
  images[1] as thumbnail_image,
  array_length(images, 1) as image_count,
  sizes,
  colors,
  stock_quantity,
  new_arrival_date,
  is_active,
  created_at
FROM public.products 
WHERE is_active = true;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_optimized_id 
ON public.products_optimized (id);

CREATE INDEX IF NOT EXISTS idx_products_optimized_category 
ON public.products_optimized (category);

CREATE INDEX IF NOT EXISTS idx_products_optimized_created 
ON public.products_optimized (created_at DESC);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_products_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.products_optimized;
END;
$$;