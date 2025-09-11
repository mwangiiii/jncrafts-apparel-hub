-- Add indexes to improve query performance for get_product_complete function
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_id_display_order 
ON product_images(product_id, display_order, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_colors_product_id 
ON product_colors(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_sizes_product_id 
ON product_sizes(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colors_display_order 
ON colors(display_order) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sizes_display_order 
ON sizes(display_order) WHERE is_active = true;

-- Optimize the get_product_complete function to use efficient JOINs instead of subqueries
CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id uuid)
RETURNS TABLE(
    id uuid, 
    name text, 
    price numeric, 
    description text, 
    category text, 
    stock_quantity integer, 
    is_active boolean, 
    new_arrival_date timestamp with time zone, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    thumbnail_index integer, 
    images json, 
    colors json, 
    sizes json
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Set a reasonable timeout for this function
    SET LOCAL statement_timeout = '8s';
    
    RETURN QUERY
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
        COALESCE(images_data.images, '[]'::json) as images,
        COALESCE(colors_data.colors, '[]'::json) as colors,
        COALESCE(sizes_data.sizes, '[]'::json) as sizes
    FROM products p
    LEFT JOIN (
        SELECT 
            pi.product_id,
            json_agg(
                json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text,
                    'is_primary', pi.is_primary,
                    'order', pi.display_order
                ) ORDER BY pi.display_order, pi.created_at
            ) as images
        FROM product_images pi
        WHERE pi.product_id = p_product_id
        GROUP BY pi.product_id
    ) images_data ON p.id = images_data.product_id
    LEFT JOIN (
        SELECT 
            pc.product_id,
            json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'hex', c.hex_code,
                    'stock', pc.stock_quantity,
                    'available', pc.is_available
                ) ORDER BY c.display_order
            ) as colors
        FROM product_colors pc
        JOIN colors c ON pc.color_id = c.id AND c.is_active = true
        WHERE pc.product_id = p_product_id
        GROUP BY pc.product_id
    ) colors_data ON p.id = colors_data.product_id
    LEFT JOIN (
        SELECT 
            ps.product_id,
            json_agg(
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'category', s.category,
                    'stock', ps.stock_quantity,
                    'available', ps.is_available
                ) ORDER BY s.display_order
            ) as sizes
        FROM product_sizes ps
        JOIN sizes s ON ps.size_id = s.id AND s.is_active = true
        WHERE ps.product_id = p_product_id
        GROUP BY ps.product_id
    ) sizes_data ON p.id = sizes_data.product_id
    WHERE p.id = p_product_id AND p.is_active = true;
END;
$function$