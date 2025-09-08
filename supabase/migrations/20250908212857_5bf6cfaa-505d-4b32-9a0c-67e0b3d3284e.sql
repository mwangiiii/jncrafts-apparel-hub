-- Optimize get_product_complete function and add performance indexes

-- Add indexes for better performance on related tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_id_display_order 
ON product_images(product_id, display_order, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_colors_product_id_active 
ON product_colors(product_id) WHERE is_available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_sizes_product_id_active 
ON product_sizes(product_id) WHERE is_available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colors_active_display_order 
ON colors(id, display_order) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sizes_active_display_order 
ON sizes(id, display_order) WHERE is_active = true;

-- Optimized get_product_complete function
CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result_json json;
BEGIN
    -- Set a shorter timeout for better performance
    SET LOCAL statement_timeout = '5s';
    
    -- Single optimized query with better joins
    WITH product_base AS (
        SELECT * FROM products 
        WHERE id = p_product_id AND is_active = true
    ),
    product_images_agg AS (
        SELECT 
            pi.product_id,
            json_agg(
                json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text,
                    'is_primary', pi.is_primary,
                    'order', pi.display_order
                ) ORDER BY pi.display_order NULLS LAST, pi.created_at
            ) as images
        FROM product_images pi
        INNER JOIN product_base pb ON pb.id = pi.product_id
        GROUP BY pi.product_id
    ),
    product_colors_agg AS (
        SELECT 
            pc.product_id,
            json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'hex', c.hex_code,
                    'stock', pc.stock_quantity,
                    'available', pc.is_available
                ) ORDER BY c.display_order NULLS LAST
            ) as colors
        FROM product_colors pc
        INNER JOIN product_base pb ON pb.id = pc.product_id
        INNER JOIN colors c ON pc.color_id = c.id AND c.is_active = true
        WHERE pc.is_available = true
        GROUP BY pc.product_id
    ),
    product_sizes_agg AS (
        SELECT 
            ps.product_id,
            json_agg(
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'category', s.category,
                    'stock', ps.stock_quantity,
                    'available', ps.is_available
                ) ORDER BY s.display_order NULLS LAST
            ) as sizes
        FROM product_sizes ps
        INNER JOIN product_base pb ON pb.id = ps.product_id
        INNER JOIN sizes s ON ps.size_id = s.id AND s.is_active = true
        WHERE ps.is_available = true
        GROUP BY ps.product_id
    )
    SELECT json_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'description', p.description,
        'category', p.category,
        'stock_quantity', p.stock_quantity,
        'is_active', p.is_active,
        'new_arrival_date', p.new_arrival_date,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'thumbnail_index', p.thumbnail_index,
        'images', COALESCE(img.images, '[]'::json),
        'colors', COALESCE(col.colors, '[]'::json),
        'sizes', COALESCE(siz.sizes, '[]'::json)
    ) INTO result_json
    FROM product_base p
    LEFT JOIN product_images_agg img ON p.id = img.product_id
    LEFT JOIN product_colors_agg col ON p.id = col.product_id
    LEFT JOIN product_sizes_agg siz ON p.id = siz.product_id;
    
    RETURN result_json;
END;
$function$;