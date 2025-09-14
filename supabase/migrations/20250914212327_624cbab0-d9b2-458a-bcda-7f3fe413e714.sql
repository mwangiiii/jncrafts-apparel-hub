-- Fix the get_product_complete function that's causing SET errors
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
    -- Single optimized query with CTEs and better joins
    -- Removed SET LOCAL statement_timeout as it's not allowed in stable functions
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
        WHERE EXISTS (SELECT 1 FROM product_base pb WHERE pb.id = pi.product_id)
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
        INNER JOIN colors c ON pc.color_id = c.id AND c.is_active = true
        WHERE EXISTS (SELECT 1 FROM product_base pb WHERE pb.id = pc.product_id)
          AND pc.is_available = true
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
        INNER JOIN sizes s ON ps.size_id = s.id AND s.is_active = true
        WHERE EXISTS (SELECT 1 FROM product_base pb WHERE pb.id = ps.product_id)
          AND ps.is_available = true
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