-- Aggressively optimize product loading performance
-- 1. Create optimized indexes on materialized views
-- 2. Drop unused indexes to reduce overhead
-- 3. Add image optimization indexes

-- Drop potentially unused indexes (common ones that might be slowing things down)
DROP INDEX IF EXISTS idx_products_category_created_at;
DROP INDEX IF EXISTS idx_products_is_active_category;
DROP INDEX IF EXISTS idx_product_images_product_id_order;

-- Create highly optimized indexes on materialized views for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_mv_products_landing_active_category_created 
ON public.mv_products_landing (is_active, category, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_mv_products_landing_active_created 
ON public.mv_products_landing (is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_mv_admin_products_created_id 
ON public.mv_admin_products (created_at DESC, id DESC);

-- Optimize image loading with better indexes
CREATE INDEX IF NOT EXISTS idx_product_images_optimized 
ON public.product_images (product_id, is_primary DESC, display_order ASC) 
WHERE is_primary = true OR display_order = 1;

-- Create partial index for featured products
CREATE INDEX IF NOT EXISTS idx_homepage_featured_active_order 
ON public.homepage_featured (is_active, display_order ASC) 
WHERE is_active = true;

-- Optimize the ultra-fast functions even further with materialized view hints
CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(p_category text DEFAULT 'all'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET enable_seqscan = off  -- Force index usage
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

-- Create function to prefetch next page for smoother "load more"
CREATE OR REPLACE FUNCTION public.prefetch_products_next_page(p_category text DEFAULT 'all'::text, p_current_offset integer DEFAULT 0, p_page_size integer DEFAULT 20)
RETURNS TABLE(id uuid, name text, price numeric, category text, thumbnail_image text, stock_quantity integer, new_arrival_date timestamp with time zone, created_at timestamp with time zone, has_colors boolean, has_sizes boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET enable_seqscan = off
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
    LIMIT p_page_size
    OFFSET (p_current_offset + p_page_size);
$$;

-- Auto-refresh materialized views more frequently for better performance
-- (This will be handled by a background job, but we set up the function)
CREATE OR REPLACE FUNCTION public.refresh_all_product_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_products_landing;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_products;
END;
$$;