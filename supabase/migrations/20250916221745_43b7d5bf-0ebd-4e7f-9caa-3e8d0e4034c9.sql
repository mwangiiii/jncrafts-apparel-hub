-- Fix the get_product_complete function to handle timeouts better
-- Simplify the function to avoid complex joins that cause timeouts

DROP FUNCTION IF EXISTS public.get_product_complete(uuid);

CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result_json json;
    product_exists boolean;
BEGIN
    -- First check if product exists and is active
    SELECT EXISTS (
        SELECT 1 FROM products 
        WHERE id = p_product_id AND is_active = true
    ) INTO product_exists;
    
    IF NOT product_exists THEN
        RETURN NULL;
    END IF;
    
    -- Build the result with simpler queries to avoid timeouts
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
        'images', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text,
                    'is_primary', pi.is_primary,
                    'order', pi.display_order
                ) ORDER BY pi.display_order NULLS LAST, pi.created_at
            )
            FROM product_images pi
            WHERE pi.product_id = p.id
        ), '[]'::json),
        'colors', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'hex', c.hex_code,
                    'stock', pc.stock_quantity,
                    'available', pc.is_available
                ) ORDER BY c.display_order NULLS LAST
            )
            FROM product_colors pc
            INNER JOIN colors c ON pc.color_id = c.id 
            WHERE pc.product_id = p.id 
              AND c.is_active = true 
              AND pc.is_available = true
        ), '[]'::json),
        'sizes', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'category', s.category,
                    'stock', ps.stock_quantity,
                    'available', ps.is_available
                ) ORDER BY s.display_order NULLS LAST
            )
            FROM product_sizes ps
            INNER JOIN sizes s ON ps.size_id = s.id 
            WHERE ps.product_id = p.id 
              AND s.is_active = true 
              AND ps.is_available = true
        ), '[]'::json)
    ) INTO result_json
    FROM products p
    WHERE p.id = p_product_id AND p.is_active = true;
    
    RETURN result_json;
END;
$$;