-- Fix remaining Security Definer functions that don't need elevated privileges

-- Fix get_featured_products_ultra_fast function
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
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
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
    ORDER BY hf.display_order ASC
    LIMIT p_limit;
$$;

-- Fix get_product_complete function
DROP FUNCTION IF EXISTS public.get_product_complete(uuid);
CREATE OR REPLACE FUNCTION public.get_product_complete(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY INVOKER
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

-- Fix is_new_arrival function
DROP FUNCTION IF EXISTS public.is_new_arrival(timestamp with time zone);
CREATE OR REPLACE FUNCTION public.is_new_arrival(product_new_arrival_date timestamp with time zone)
RETURNS boolean
LANGUAGE sql
IMMUTABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT product_new_arrival_date IS NOT NULL 
  AND product_new_arrival_date > (now() - interval '10 days');
$$;

-- Fix validate_discount_code function
DROP FUNCTION IF EXISTS public.validate_discount_code(text, numeric);
CREATE OR REPLACE FUNCTION public.validate_discount_code(p_code text, p_order_total numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  discount_record RECORD;
BEGIN
  -- Normalize the code to uppercase
  p_code := UPPER(TRIM(p_code));
  
  -- Check if code exists and is valid
  SELECT * INTO discount_record
  FROM discounts
  WHERE code = p_code
    AND is_active = true
    AND requires_code = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now());
  
  -- If discount doesn't exist or isn't valid
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_code',
      'message', 'This promo code is not valid or has expired'
    );
  END IF;
  
  -- Check usage limits
  IF discount_record.usage_limit IS NOT NULL AND discount_record.used_count >= discount_record.usage_limit THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'usage_limit_exceeded',
      'message', 'This promo code has reached its usage limit'
    );
  END IF;
  
  -- Check minimum order amount
  IF discount_record.min_order_amount IS NOT NULL AND p_order_total < discount_record.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'min_order_not_met',
      'message', 'Minimum order of $' || discount_record.min_order_amount || ' required for this code'
    );
  END IF;
  
  -- Return valid discount (only safe fields)
  RETURN jsonb_build_object(
    'valid', true,
    'discount', jsonb_build_object(
      'id', discount_record.id,
      'name', discount_record.name,
      'description', discount_record.description,
      'discount_type', discount_record.discount_type,
      'discount_value', discount_record.discount_value,
      'code', discount_record.code
    )
  );
END;
$$;

-- Fix is_product_eligible_for_discount function
DROP FUNCTION IF EXISTS public.is_product_eligible_for_discount(uuid, uuid);
CREATE OR REPLACE FUNCTION public.is_product_eligible_for_discount(p_product_id uuid, p_discount_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  discount_record RECORD;
  is_eligible BOOLEAN := FALSE;
BEGIN
  -- Get discount details
  SELECT * INTO discount_record
  FROM discounts
  WHERE id = p_discount_id 
  AND is_active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now());
  
  -- If discount doesn't exist or isn't active, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if discount applies to all products
  IF discount_record.applies_to = 'all' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if product is specifically included
  IF discount_record.applies_to = 'specific' THEN
    SELECT EXISTS(
      SELECT 1 FROM discount_products 
      WHERE discount_id = p_discount_id 
      AND product_id = p_product_id
    ) INTO is_eligible;
    RETURN is_eligible;
  END IF;
  
  -- Check if product category is included
  IF discount_record.applies_to = 'category' THEN
    SELECT EXISTS(
      SELECT 1 FROM discount_products dp
      JOIN products p ON p.category = dp.category
      WHERE dp.discount_id = p_discount_id 
      AND p.id = p_product_id
    ) INTO is_eligible;
    RETURN is_eligible;
  END IF;
  
  RETURN FALSE;
END;
$$;