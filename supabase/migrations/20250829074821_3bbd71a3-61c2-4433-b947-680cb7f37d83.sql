-- Fix security issues from previous migration

-- Step 1: Drop and recreate the view without SECURITY DEFINER issues
DROP VIEW IF EXISTS public.cart_items_with_details;

-- Create the view without problematic security settings
CREATE VIEW public.cart_items_with_details AS
SELECT 
    ci.id,
    ci.user_id,
    ci.session_id,
    ci.product_id,
    ci.color_id,
    ci.size_id,
    ci.quantity,
    ci.price,
    ci.created_at,
    ci.updated_at,
    -- Product details
    p.name as product_name,
    p.description as product_description,
    p.category as product_category,
    -- Get primary product image
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
     LIMIT 1) as product_image,
    -- Color details
    c.name as color_name,
    c.hex_code as color_hex,
    -- Size details  
    s.name as size_name,
    s.category as size_category
FROM public.cart_items ci
JOIN public.products p ON ci.product_id = p.id
JOIN public.colors c ON ci.color_id = c.id
JOIN public.sizes s ON ci.size_id = s.id;

-- Step 2: Create RLS policies for the view that properly inherit from underlying tables
-- Note: Views inherit RLS from underlying tables by default, so we don't need explicit policies

-- Step 3: Update the helper function to have proper search_path setting
CREATE OR REPLACE FUNCTION public.add_to_cart_normalized(
    p_product_id uuid,
    p_color_name text,
    p_size_name text,
    p_quantity integer,
    p_price numeric,
    p_user_id uuid DEFAULT NULL,
    p_session_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_color_id uuid;
    v_size_id uuid;
    v_cart_item_id uuid;
    v_existing_item_id uuid;
BEGIN
    -- Validate inputs
    IF p_product_id IS NULL OR p_quantity <= 0 OR p_price <= 0 THEN
        RAISE EXCEPTION 'Invalid input parameters';
    END IF;
    
    IF (p_user_id IS NULL AND p_session_id IS NULL) OR (p_user_id IS NOT NULL AND p_session_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Must provide either user_id or session_id, but not both';
    END IF;
    
    -- Get color_id by name (case insensitive)
    SELECT id INTO v_color_id 
    FROM colors 
    WHERE LOWER(name) = LOWER(p_color_name) AND is_active = true
    LIMIT 1;
    
    -- If color not found, use "Unknown" 
    IF v_color_id IS NULL THEN
        SELECT id INTO v_color_id FROM colors WHERE name = 'Unknown' LIMIT 1;
    END IF;
    
    -- Get size_id by name (case insensitive)
    SELECT id INTO v_size_id
    FROM sizes
    WHERE LOWER(name) = LOWER(p_size_name) AND is_active = true  
    LIMIT 1;
    
    -- If size not found, use "Unknown"
    IF v_size_id IS NULL THEN
        SELECT id INTO v_size_id FROM sizes WHERE name = 'Unknown' LIMIT 1;
    END IF;
    
    -- Check if item already exists in cart
    SELECT id INTO v_existing_item_id
    FROM cart_items
    WHERE product_id = p_product_id
      AND color_id = v_color_id
      AND size_id = v_size_id
      AND (
          (p_user_id IS NOT NULL AND user_id = p_user_id) OR
          (p_session_id IS NOT NULL AND session_id = p_session_id)
      );
    
    -- If exists, update quantity
    IF v_existing_item_id IS NOT NULL THEN
        UPDATE cart_items 
        SET quantity = quantity + p_quantity,
            updated_at = now()
        WHERE id = v_existing_item_id;
        
        RETURN v_existing_item_id;
    END IF;
    
    -- Insert new cart item
    INSERT INTO cart_items (
        user_id, session_id, product_id, color_id, size_id, quantity, price
    ) VALUES (
        p_user_id, p_session_id, p_product_id, v_color_id, v_size_id, p_quantity, p_price
    ) RETURNING id INTO v_cart_item_id;
    
    RETURN v_cart_item_id;
END;
$$;