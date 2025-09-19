-- COMPREHENSIVE PERFORMANCE OPTIMIZATION FOR PRODUCT QUERIES
-- This addresses statement timeouts by adding critical indexes and optimizations

-- 1. CREATE CRITICAL INDEXES FOR MATERIALIZED VIEWS AND BASE TABLES

-- Index on mv_products_landing for ultra-fast queries
DROP INDEX IF EXISTS idx_mv_products_landing_performance;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_products_landing_performance 
ON public.mv_products_landing (is_active, category, created_at DESC) 
WHERE is_active = true;

-- Partial index for "all" category queries (most common)
DROP INDEX IF EXISTS idx_mv_products_landing_all_active;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mv_products_landing_all_active 
ON public.mv_products_landing (created_at DESC) 
WHERE is_active = true;

-- Covering index for products table (backup queries)
DROP INDEX IF EXISTS idx_products_performance_covering;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_performance_covering 
ON public.products (is_active, category, created_at DESC, id, name, price, stock_quantity, new_arrival_date)
WHERE is_active = true;

-- Index for product_images (thumbnail lookup)
DROP INDEX IF EXISTS idx_product_images_thumbnail_fast;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_thumbnail_fast 
ON public.product_images (product_id, display_order, is_primary) 
INCLUDE (image_url);

-- Index for homepage_featured
DROP INDEX IF EXISTS idx_homepage_featured_active_order;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homepage_featured_active_order 
ON public.homepage_featured (is_active, display_order) 
WHERE is_active = true;

-- 2. CREATE ULTRA-SIMPLIFIED FUNCTIONS WITH MINIMAL OVERHEAD

-- Ultra-minimal product function - no complex WHERE clauses
DROP FUNCTION IF EXISTS public.get_products_minimal(integer, integer);
CREATE OR REPLACE FUNCTION public.get_products_minimal(
    p_limit integer DEFAULT 20, 
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
SET enable_seqscan TO 'off'
SET work_mem TO '64MB'
SET statement_timeout TO '2s'
SET enable_nestloop TO 'off'
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
    WHERE pl.is_active = true
    ORDER BY pl.created_at DESC
    LIMIT LEAST(p_limit, 20)
    OFFSET GREATEST(0, p_offset);
$function$;

-- Category-specific optimized function
DROP FUNCTION IF EXISTS public.get_products_by_category_fast(text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_products_by_category_fast(
    p_category text, 
    p_limit integer DEFAULT 20, 
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
SET enable_seqscan TO 'off'
SET work_mem TO '64MB'
SET statement_timeout TO '2s'
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
    WHERE pl.is_active = true
      AND pl.category = p_category
    ORDER BY pl.created_at DESC
    LIMIT LEAST(p_limit, 20)
    OFFSET GREATEST(0, p_offset);
$function$;

-- Replace get_products_ultra_fast with ultra-simplified version
DROP FUNCTION IF EXISTS public.get_products_ultra_fast(text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_products_ultra_fast(
    p_category text DEFAULT 'all'::text, 
    p_limit integer DEFAULT 20, 
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
    -- Use different strategies based on category
    IF p_category = 'all' THEN
        RETURN QUERY 
        SELECT * FROM public.get_products_minimal(p_limit, p_offset);
    ELSE
        RETURN QUERY 
        SELECT * FROM public.get_products_by_category_fast(p_category, p_limit, p_offset);
    END IF;
END;
$function$;

-- 3. UPDATE FEATURED PRODUCTS WITH SIMPLER LOGIC
DROP FUNCTION IF EXISTS public.get_featured_products_ultra_fast(integer);
CREATE OR REPLACE FUNCTION public.get_featured_products_ultra_fast(p_limit integer DEFAULT 6)
RETURNS TABLE(
    id uuid, 
    display_order integer, 
    product_id uuid, 
    name text, 
    price numeric, 
    category text, 
    thumbnail_image text, 
    stock_quantity integer, 
    new_arrival_date timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET enable_seqscan TO 'off'
SET statement_timeout TO '1s'
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
      AND pl.is_active = true
    ORDER BY hf.display_order ASC
    LIMIT LEAST(p_limit, 8);
$function$;

-- 4. REFRESH AND ANALYZE ALL CRITICAL TABLES
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_products_landing;
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_admin_products;

-- Update statistics for optimal query planning
ANALYZE public.mv_products_landing;
ANALYZE public.mv_admin_products;
ANALYZE public.products;
ANALYZE public.product_images;
ANALYZE public.homepage_featured;