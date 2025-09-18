-- Fix security definer view issues by recreating views with security_invoker=true

-- Drop and recreate cart_items_with_details view with security_invoker
DROP VIEW IF EXISTS public.cart_items_with_details CASCADE;
CREATE VIEW public.cart_items_with_details
WITH (security_invoker = true) AS
WITH primary_images AS (
    SELECT DISTINCT ON (product_images.product_id) 
        product_images.product_id,
        product_images.image_url
    FROM product_images
    ORDER BY product_images.product_id, 
             product_images.is_primary DESC, 
             product_images.display_order, 
             product_images.created_at
)
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
    p.name AS product_name,
    p.description AS product_description,
    p.category AS product_category,
    pi.image_url AS product_image,
    c.name AS color_name,
    c.hex_code AS color_hex,
    s.name AS size_name,
    s.category AS size_category
FROM cart_items ci
JOIN products p ON (ci.product_id = p.id AND p.is_active = true)
JOIN colors c ON ci.color_id = c.id
JOIN sizes s ON ci.size_id = s.id
LEFT JOIN primary_images pi ON p.id = pi.product_id;

-- Drop and recreate profiles_secure view with security_invoker
DROP VIEW IF EXISTS public.profiles_secure CASCADE;
CREATE VIEW public.profiles_secure
WITH (security_invoker = true) AS
SELECT 
    id,
    user_id,
    created_at,
    updated_at,
    CASE
        WHEN (user_id = auth.uid()) THEN full_name
        WHEN is_admin(auth.uid()) THEN full_name
        ELSE NULL::text
    END AS full_name,
    CASE
        WHEN (user_id = auth.uid()) THEN phone
        WHEN is_admin(auth.uid()) THEN mask_phone(phone)
        ELSE NULL::text
    END AS phone,
    CASE
        WHEN (user_id = auth.uid()) THEN address
        WHEN is_admin(auth.uid()) THEN mask_address(address)
        ELSE NULL::text
    END AS address
FROM profiles p;