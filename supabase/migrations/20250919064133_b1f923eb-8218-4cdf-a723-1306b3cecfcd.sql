-- COMPREHENSIVE PERFORMANCE OPTIMIZATION FOR PRODUCT QUERIES
-- This addresses statement timeouts by adding critical indexes and optimizations

-- 1. CREATE CRITICAL INDEXES FOR MATERIALIZED VIEWS AND BASE TABLES

-- Index on mv_products_landing for ultra-fast queries
DROP INDEX IF EXISTS idx_mv_products_landing_performance;
CREATE INDEX idx_mv_products_landing_performance 
ON public.mv_products_landing (is_active, category, created_at DESC) 
WHERE is_active = true;

-- Partial index for "all" category queries (most common)
DROP INDEX IF EXISTS idx_mv_products_landing_all_active;
CREATE INDEX idx_mv_products_landing_all_active 
ON public.mv_products_landing (created_at DESC) 
WHERE is_active = true;

-- Covering index for products table (backup queries)
DROP INDEX IF EXISTS idx_products_performance_covering;
CREATE INDEX idx_products_performance_covering 
ON public.products (is_active, category, created_at DESC, id, name, price, stock_quantity, new_arrival_date)
WHERE is_active = true;

-- Index for product_images (thumbnail lookup)
DROP INDEX IF EXISTS idx_product_images_thumbnail_fast;
CREATE INDEX idx_product_images_thumbnail_fast 
ON public.product_images (product_id, display_order, is_primary);

-- Index for homepage_featured
DROP INDEX IF EXISTS idx_homepage_featured_active_order;
CREATE INDEX idx_homepage_featured_active_order 
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