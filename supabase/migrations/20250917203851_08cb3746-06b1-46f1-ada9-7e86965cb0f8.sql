-- Fix Security Definer View issue by reviewing and updating functions
-- Remove SECURITY DEFINER from functions that don't need elevated privileges

-- 1. Update product retrieval functions to use SECURITY INVOKER instead of DEFINER
-- This ensures they respect the calling user's RLS policies

-- Fix get_products_ultra_fast function
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
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        (SELECT pi.image_url 
         FROM product_images pi 
         WHERE pi.product_id = p.id 
         ORDER BY pi.is_primary DESC NULLS LAST, pi.display_order ASC NULLS LAST
         LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        false as has_colors,
        false as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Fix get_products_lightweight function
DROP FUNCTION IF EXISTS public.get_products_lightweight(text, integer, timestamp with time zone, uuid);
CREATE OR REPLACE FUNCTION public.get_products_lightweight(
    p_category text DEFAULT 'all'::text, 
    p_limit integer DEFAULT 20, 
    p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, 
    p_cursor_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
    id uuid, 
    name text, 
    price numeric, 
    category text, 
    thumbnail_image text, 
    stock_quantity integer, 
    new_arrival_date timestamp with time zone, 
    created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY INVOKER
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

-- Fix get_products_lightweight_v2 function
DROP FUNCTION IF EXISTS public.get_products_lightweight_v2(text, integer, integer);
CREATE OR REPLACE FUNCTION public.get_products_lightweight_v2(
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
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        (SELECT pi.image_url 
         FROM product_images pi 
         WHERE pi.product_id = p.id 
         ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
         LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
        EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Fix get_categories_fast function
DROP FUNCTION IF EXISTS public.get_categories_fast();
CREATE OR REPLACE FUNCTION public.get_categories_fast()
RETURNS TABLE(category text)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT p.category
  FROM public.products p
  WHERE p.is_active = true
  ORDER BY p.category;
$$;

-- Keep SECURITY DEFINER for functions that need elevated privileges
-- (admin functions, auth functions, etc. - these are correctly using SECURITY DEFINER)