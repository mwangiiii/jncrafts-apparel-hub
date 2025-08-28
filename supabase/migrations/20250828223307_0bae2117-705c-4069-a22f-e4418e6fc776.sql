-- =====================================================
-- PRODUCT TABLE REFINEMENT AND DATA MIGRATION (FIXED)
-- =====================================================
-- This migration migrates existing data to normalized tables and cleans up the products table

-- =====================================================
-- 1. MIGRATE EXISTING PRODUCT IMAGES (FIXED)
-- =====================================================

-- Migrate images from TEXT[] array to product_images table
INSERT INTO public.product_images (product_id, image_url, display_order, is_primary)
SELECT 
    p.id as product_id,
    TRIM(image_url) as image_url,
    (array_pos - 1) as display_order,
    CASE WHEN array_pos = 1 THEN true ELSE false END as is_primary
FROM public.products p
CROSS JOIN LATERAL (
    SELECT 
        unnest(p.images) as image_url,
        generate_subscripts(p.images, 1) as array_pos
) as img_data
WHERE p.images IS NOT NULL 
  AND array_length(p.images, 1) > 0
  AND TRIM(image_url) != ''
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. MIGRATE EXISTING PRODUCT COLORS (FIXED)
-- =====================================================

-- First, handle products with TEXT[] array colors
INSERT INTO public.product_colors (product_id, color_id, is_available)
SELECT DISTINCT
    p.id as product_id,
    c.id as color_id,
    true as is_available
FROM public.products p
CROSS JOIN LATERAL unnest(COALESCE(p.colors, ARRAY[]::text[])) as color_name
JOIN public.colors c ON UPPER(c.name) = TRIM(UPPER(color_name))
WHERE p.colors IS NOT NULL 
  AND array_length(p.colors, 1) > 0
  AND TRIM(color_name) != ''
ON CONFLICT (product_id, color_id) DO NOTHING;

-- Add any missing colors that exist in products but not in colors table
INSERT INTO public.colors (name, display_order, is_active)
SELECT DISTINCT
    TRIM(INITCAP(color_name)) as name,
    (SELECT COALESCE(MAX(display_order), 0) + ROW_NUMBER() OVER () FROM public.colors) as display_order,
    true as is_active
FROM public.products p
CROSS JOIN LATERAL unnest(COALESCE(p.colors, ARRAY[]::text[])) as color_name
WHERE TRIM(color_name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.colors c WHERE UPPER(c.name) = TRIM(UPPER(color_name))
  )
ON CONFLICT (name) DO NOTHING;

-- Now link the newly added colors
INSERT INTO public.product_colors (product_id, color_id, is_available)
SELECT DISTINCT
    p.id as product_id,
    c.id as color_id,
    true as is_available
FROM public.products p
CROSS JOIN LATERAL unnest(COALESCE(p.colors, ARRAY[]::text[])) as color_name
JOIN public.colors c ON UPPER(c.name) = TRIM(UPPER(color_name))
WHERE TRIM(color_name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.product_colors pc 
    WHERE pc.product_id = p.id AND pc.color_id = c.id
  )
ON CONFLICT (product_id, color_id) DO NOTHING;

-- =====================================================
-- 3. MIGRATE EXISTING PRODUCT SIZES (FIXED)
-- =====================================================

-- Add any missing sizes that exist in products but not in sizes table
INSERT INTO public.sizes (name, category, display_order, is_active)
SELECT DISTINCT
    TRIM(UPPER(size_name)) as name,
    CASE 
        WHEN TRIM(UPPER(size_name)) ~ '^[0-9]+(\.[0-9]+)?$' THEN 'shoes'
        WHEN TRIM(UPPER(size_name)) IN ('ONE SIZE', 'ONESIZE', 'OS') THEN 'generic'
        ELSE 'clothing'
    END as category,
    (SELECT COALESCE(MAX(display_order), 0) + ROW_NUMBER() OVER () FROM public.sizes) as display_order,
    true as is_active
FROM public.products p
CROSS JOIN LATERAL unnest(COALESCE(p.sizes, ARRAY[]::text[])) as size_name
WHERE TRIM(size_name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.sizes s WHERE UPPER(s.name) = TRIM(UPPER(size_name))
  )
ON CONFLICT (name) DO NOTHING;

-- Link products to sizes
INSERT INTO public.product_sizes (product_id, size_id, is_available)
SELECT DISTINCT
    p.id as product_id,
    s.id as size_id,
    true as is_available
FROM public.products p
CROSS JOIN LATERAL unnest(COALESCE(p.sizes, ARRAY[]::text[])) as size_name
JOIN public.sizes s ON UPPER(s.name) = TRIM(UPPER(size_name))
WHERE TRIM(size_name) != ''
ON CONFLICT (product_id, size_id) DO NOTHING;

-- =====================================================
-- 4. INITIALIZE INVENTORY TRACKING
-- =====================================================

-- Create basic inventory records for each product-color-size combination
INSERT INTO public.product_inventory (product_id, color_id, size_id, stock_quantity, reorder_level)
SELECT 
    p.id as product_id,
    pc.color_id,
    ps.size_id,
    COALESCE(p.stock_quantity, 0) as stock_quantity,
    5 as reorder_level
FROM public.products p
LEFT JOIN public.product_colors pc ON p.id = pc.product_id AND pc.is_available = true
LEFT JOIN public.product_sizes ps ON p.id = ps.product_id AND ps.is_available = true
WHERE pc.color_id IS NOT NULL OR ps.size_id IS NOT NULL
ON CONFLICT (product_id, color_id, size_id) DO NOTHING;

-- For products without specific colors/sizes, create a general inventory record
INSERT INTO public.product_inventory (product_id, stock_quantity, reorder_level)
SELECT 
    p.id as product_id,
    COALESCE(p.stock_quantity, 0) as stock_quantity,
    5 as reorder_level
FROM public.products p
WHERE NOT EXISTS (SELECT 1 FROM public.product_colors WHERE product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.product_sizes WHERE product_id = p.id)
ON CONFLICT (product_id, color_id, size_id) DO NOTHING;

-- =====================================================
-- 5. UPDATE PRODUCTS TABLE STRUCTURE
-- =====================================================

-- Set thumbnail_index based on primary image
UPDATE public.products 
SET thumbnail_index = 0
WHERE thumbnail_index IS NULL;

-- =====================================================
-- 6. REMOVE OLD COLUMNS (After successful migration)
-- =====================================================

-- Remove the old array-based columns since data is now normalized
ALTER TABLE public.products DROP COLUMN IF EXISTS images;
ALTER TABLE public.products DROP COLUMN IF EXISTS colors;  
ALTER TABLE public.products DROP COLUMN IF EXISTS sizes;
ALTER TABLE public.products DROP COLUMN IF EXISTS videos;

-- =====================================================
-- 7. CREATE OPTIMIZED FUNCTIONS FOR PRODUCT QUERIES
-- =====================================================

-- Function to get product with all related data
CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    price NUMERIC,
    description TEXT,
    category TEXT,
    stock_quantity INTEGER,
    is_active BOOLEAN,
    new_arrival_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    thumbnail_index INTEGER,
    images JSON,
    colors JSON,
    sizes JSON
) 
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.description,
        p.category,
        p.stock_quantity,
        p.is_active,
        p.new_arrival_date,
        p.created_at,
        p.updated_at,
        p.thumbnail_index,
        -- Images
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text,
                    'is_primary', pi.is_primary,
                    'order', pi.display_order
                ) ORDER BY pi.display_order, pi.created_at
            ) FROM product_images pi WHERE pi.product_id = p.id),
            '[]'::json
        ) as images,
        
        -- Colors
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'hex', c.hex_code,
                    'stock', pc.stock_quantity,
                    'available', pc.is_available
                ) ORDER BY c.display_order
            ) FROM product_colors pc 
             JOIN colors c ON pc.color_id = c.id 
             WHERE pc.product_id = p.id),
            '[]'::json
        ) as colors,
        
        -- Sizes
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'category', s.category,
                    'stock', ps.stock_quantity,
                    'available', ps.is_available
                ) ORDER BY s.display_order
            ) FROM product_sizes ps 
             JOIN sizes s ON ps.size_id = s.id 
             WHERE ps.product_id = p.id),
            '[]'::json
        ) as sizes
    FROM products p
    WHERE p.id = p_product_id
      AND p.is_active = true;
$$;

-- Function for lightweight product listing (homepage, search, etc.)
CREATE OR REPLACE FUNCTION public.get_products_lightweight_v2(
    p_category TEXT DEFAULT 'all',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    price NUMERIC,
    category TEXT,
    thumbnail_image TEXT,
    stock_quantity INTEGER,
    new_arrival_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    has_colors BOOLEAN,
    has_sizes BOOLEAN
) 
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.id,
        p.name,
        p.price,
        p.category,
        -- Get primary image or first image
        (SELECT pi.image_url 
         FROM product_images pi 
         WHERE pi.product_id = p.id 
         ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
         LIMIT 1) as thumbnail_image,
        p.stock_quantity,
        p.new_arrival_date,
        p.created_at,
        -- Quick checks for variants
        EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
        EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes
    FROM products p
    WHERE p.is_active = true
      AND (p_category = 'all' OR p.category = p_category)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- =====================================================
-- 8. ENABLE REALTIME FOR NEW TABLES
-- =====================================================

-- Enable realtime updates for inventory and product changes
ALTER TABLE public.product_images REPLICA IDENTITY FULL;
ALTER TABLE public.product_colors REPLICA IDENTITY FULL;
ALTER TABLE public.product_sizes REPLICA IDENTITY FULL;
ALTER TABLE public.product_inventory REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_colors; 
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_sizes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_inventory;