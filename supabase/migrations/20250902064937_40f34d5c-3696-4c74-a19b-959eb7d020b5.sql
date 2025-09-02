-- Normalize Cart Items Structure
-- This addresses timeout issues by optimizing relationships and reducing redundancy

-- First, let's check and update the cart_items table structure
-- The current table already has most of what we need, but let's ensure it's optimal

-- Drop the existing view to recreate it
DROP VIEW IF EXISTS cart_items_with_details CASCADE;

-- Update cart_items table to ensure it matches the normalized structure
-- Add constraints and optimize existing structure
ALTER TABLE cart_items 
    DROP CONSTRAINT IF EXISTS cart_items_quantity_check,
    ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0);

-- Add unique constraint to prevent duplicate entries
DROP INDEX IF EXISTS idx_cart_items_unique_combination;
CREATE UNIQUE INDEX idx_cart_items_unique_combination ON cart_items(
    COALESCE(user_id::text, ''), 
    COALESCE(session_id, ''), 
    product_id, 
    color_id, 
    size_id
);

-- Create optimized view for cart items with details
CREATE OR REPLACE VIEW cart_items_with_details AS
SELECT 
    ci.id,
    ci.user_id,
    ci.session_id,
    ci.product_id,
    ci.quantity,
    ci.color_id,
    ci.size_id,
    ci.price,
    ci.created_at,
    ci.updated_at,
    
    -- Product details
    p.name as product_name,
    p.description as product_description,
    p.category as product_category,
    
    -- Color details
    c.name as color_name,
    c.hex_code as color_hex,
    
    -- Size details
    s.name as size_name,
    s.category as size_category,
    
    -- Primary product image from product_images table
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
     LIMIT 1) as product_image
    
FROM cart_items ci
JOIN products p ON ci.product_id = p.id AND p.is_active = true
LEFT JOIN colors c ON ci.color_id = c.id AND c.is_active = true
LEFT JOIN sizes s ON ci.size_id = s.id AND s.is_active = true;

-- Performance indexes for cart operations
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_created ON cart_items(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Optimized function to get cart summary
CREATE OR REPLACE FUNCTION get_cart_summary(p_user_id UUID DEFAULT NULL, p_session_id TEXT DEFAULT NULL)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Validate input - need either user_id or session_id
    IF (p_user_id IS NULL AND p_session_id IS NULL) THEN
        RETURN json_build_object(
            'total_items', 0,
            'total_amount', 0,
            'item_count', 0
        );
    END IF;
    
    SELECT json_build_object(
        'total_items', COALESCE(SUM(quantity), 0),
        'total_amount', COALESCE(SUM(quantity * price), 0),
        'item_count', COUNT(*)
    )
    INTO result
    FROM cart_items_with_details
    WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
       OR (p_session_id IS NOT NULL AND session_id = p_session_id);
    
    RETURN result;
END;
$$;

-- Enhanced upsert function for cart items that works with existing structure
CREATE OR REPLACE FUNCTION upsert_cart_item(
    p_product_id UUID,
    p_quantity INTEGER,
    p_price NUMERIC,
    p_color_name TEXT DEFAULT 'Default',
    p_size_name TEXT DEFAULT 'One Size',
    p_user_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_color_id UUID;
    v_size_id UUID;
    v_cart_item_id UUID;
BEGIN
    -- Validate inputs
    IF p_product_id IS NULL OR p_quantity <= 0 OR p_price <= 0 THEN
        RAISE EXCEPTION 'Invalid input parameters';
    END IF;
    
    IF (p_user_id IS NULL AND p_session_id IS NULL) OR (p_user_id IS NOT NULL AND p_session_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Must provide either user_id or session_id, but not both';
    END IF;
    
    -- Get color_id by name
    SELECT id INTO v_color_id 
    FROM colors 
    WHERE LOWER(name) = LOWER(p_color_name) AND is_active = true
    LIMIT 1;
    
    -- If color not found, use default
    IF v_color_id IS NULL THEN
        SELECT id INTO v_color_id FROM colors WHERE LOWER(name) = 'default' OR LOWER(name) = 'unknown' LIMIT 1;
    END IF;
    
    -- Get size_id by name
    SELECT id INTO v_size_id
    FROM sizes
    WHERE LOWER(name) = LOWER(p_size_name) AND is_active = true  
    LIMIT 1;
    
    -- If size not found, use default
    IF v_size_id IS NULL THEN
        SELECT id INTO v_size_id FROM sizes WHERE LOWER(name) = 'one size' OR LOWER(name) = 'unknown' LIMIT 1;
    END IF;
    
    -- Use the existing add_to_cart_normalized function
    SELECT add_to_cart_normalized(
        p_product_id, 
        p_color_name, 
        p_size_name, 
        p_quantity, 
        p_price, 
        p_user_id, 
        p_session_id
    ) INTO v_cart_item_id;
    
    RETURN v_cart_item_id;
END;
$$;

-- Function to clear cart
CREATE OR REPLACE FUNCTION clear_cart(p_user_id UUID DEFAULT NULL, p_session_id TEXT DEFAULT NULL)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (p_user_id IS NULL AND p_session_id IS NULL) THEN
        RAISE EXCEPTION 'Must provide either user_id or session_id';
    END IF;
    
    DELETE FROM cart_items 
    WHERE (p_user_id IS NOT NULL AND user_id = p_user_id)
       OR (p_session_id IS NOT NULL AND session_id = p_session_id);
END;
$$;

-- Function to remove cart item
CREATE OR REPLACE FUNCTION remove_cart_item(p_item_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item_exists BOOLEAN;
BEGIN
    DELETE FROM cart_items 
    WHERE id = p_item_id 
    AND (
        (user_id = auth.uid()) OR 
        (session_id IS NOT NULL AND validate_guest_session_secure(session_id))
    );
    
    GET DIAGNOSTICS item_exists = FOUND;
    RETURN item_exists;
END;
$$;

-- Function to update cart item quantity
CREATE OR REPLACE FUNCTION update_cart_item_quantity(p_item_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item_exists BOOLEAN;
BEGIN
    IF p_quantity <= 0 THEN
        -- Remove item if quantity is 0 or negative
        RETURN remove_cart_item(p_item_id);
    END IF;
    
    UPDATE cart_items 
    SET quantity = p_quantity, updated_at = now()
    WHERE id = p_item_id 
    AND (
        (user_id = auth.uid()) OR 
        (session_id IS NOT NULL AND validate_guest_session_secure(session_id))
    );
    
    GET DIAGNOSTICS item_exists = FOUND;
    RETURN item_exists;
END;
$$;