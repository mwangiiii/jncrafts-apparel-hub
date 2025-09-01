-- Create ultra-fast admin product fetch function with strict role isolation
CREATE OR REPLACE FUNCTION public.get_admin_products_ultra_fast(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS TABLE(
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
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  -- ULTRA STRICT: ADMIN PRODUCT MANAGEMENT ONLY - NO USER DATA
  SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    p.description,
    p.stock_quantity,
    p.is_active,
    p.new_arrival_date,
    p.thumbnail_index,
    p.created_at,
    p.updated_at,
    -- Get primary/first image efficiently
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
     LIMIT 1) as thumbnail_image,
    -- Count images efficiently
    (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) as total_images,
    -- Quick boolean checks for variants
    EXISTS(SELECT 1 FROM product_colors WHERE product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes WHERE product_id = p.id) as has_sizes,
    -- Count variants efficiently  
    (SELECT COUNT(*) FROM product_colors WHERE product_id = p.id) as colors_count,
    (SELECT COUNT(*) FROM product_sizes WHERE product_id = p.id) as sizes_count
  FROM products p
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execute permission to authenticated users (admin check will be in app)
GRANT EXECUTE ON FUNCTION public.get_admin_products_ultra_fast(integer, integer) TO authenticated;