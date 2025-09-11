-- Fix get_product_complete function to return JSON object instead of TABLE
DROP FUNCTION IF EXISTS public.get_product_complete(uuid);

CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result_json json;
BEGIN
    -- Set a reasonable timeout for this function
    SET LOCAL statement_timeout = '8s';
    
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
        'images', COALESCE(images_data.images, '[]'::json),
        'colors', COALESCE(colors_data.colors, '[]'::json),
        'sizes', COALESCE(sizes_data.sizes, '[]'::json)
    ) INTO result_json
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
    
    RETURN result_json;
END;
$function$