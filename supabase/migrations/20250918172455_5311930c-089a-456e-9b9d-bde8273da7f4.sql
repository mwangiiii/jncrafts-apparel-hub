-- Fix get_admin_products_ultra_fast function to use SECURITY INVOKER
-- This function already has admin checks built in, so it can use SECURITY INVOKER

DROP FUNCTION IF EXISTS public.get_admin_products_ultra_fast(integer, integer);
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
RETURNS TABLE(
    id uuid, 
    name text, 
    price numeric, 
    category text, 
    description text, 
    stock_quantity integer, 
    is_active boolean, 
    new_arrival_date timestamp with time zone, 
    thumbnail_index integer, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    thumbnail_image text, 
    total_images integer, 
    has_colors boolean, 
    has_sizes boolean, 
    colors_count integer, 
    sizes_count integer
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
    -- Admin check and return data
    SELECT 
        map.id,
        map.name,
        map.price,
        map.category,
        map.description,
        map.stock_quantity,
        map.is_active,
        map.new_arrival_date,
        map.thumbnail_index,
        map.created_at,
        map.updated_at,
        map.thumbnail_image,
        map.total_images::integer,
        map.has_colors,
        map.has_sizes,
        map.colors_count::integer,
        map.sizes_count::integer
    FROM public.mv_admin_products map
    WHERE public.is_admin(auth.uid()) -- Admin check in function
    ORDER BY map.created_at DESC, map.id DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Fix get_valid_status_transitions function
DROP FUNCTION IF EXISTS public.get_valid_status_transitions(text);
CREATE OR REPLACE FUNCTION public.get_valid_status_transitions(current_status_name text)
RETURNS TABLE(id uuid, name character varying, display_name text, description text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Define valid transitions based on business logic
  IF current_status_name = 'pending' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('confirmed', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'confirmed' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('processing', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'processing' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('packed', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'packed' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('shipped', 'cancelled') AND os.is_active = true;
  ELSIF current_status_name = 'shipped' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('out_for_delivery', 'delivered') AND os.is_active = true;
  ELSIF current_status_name = 'out_for_delivery' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('delivered', 'failed') AND os.is_active = true;
  ELSIF current_status_name = 'delivered' THEN
    RETURN QUERY
    SELECT os.id, os.name, os.display_name, os.description 
    FROM order_status os 
    WHERE os.name IN ('refunded') AND os.is_active = true;
  ELSE
    -- For cancelled, failed, refunded - no further transitions typically allowed
    RETURN;
  END IF;
END;
$$;