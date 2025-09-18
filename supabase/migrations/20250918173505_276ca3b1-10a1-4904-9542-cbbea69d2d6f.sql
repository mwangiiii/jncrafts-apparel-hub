-- Fix remaining security definer view and search path issues

-- Fix all functions to have proper search_path and security settings
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

-- Ensure all functions have search_path set and proper security
CREATE OR REPLACE FUNCTION public.add_to_cart_normalized(p_product_id uuid, p_color_name text, p_size_name text, p_quantity integer, p_price numeric, p_user_id uuid DEFAULT NULL::uuid, p_session_id text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  -- Needs definer for cart operations
SET search_path TO 'public'
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

-- Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Needs definer for user creation
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Check if this is a seeded admin user
  IF NEW.email IN ('mwangiwanjiku033@gmail.com', 'admin@jncrafts.com', 'justintheurimbugua@gmail.com') THEN
    -- Grant admin role immediately for seeded admin users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Regular users get customer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
  END IF;
  
  RETURN NEW;
END;
$$;