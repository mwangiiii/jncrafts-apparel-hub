-- Update cart_items_with_details view to include all necessary fields including product images
DROP VIEW IF EXISTS cart_items_with_details;

CREATE VIEW cart_items_with_details AS
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
  -- Product image (get primary image or first image)
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
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
JOIN colors c ON ci.color_id = c.id
JOIN sizes s ON ci.size_id = s.id
WHERE p.is_active = true;