-- Create materialized view for ultra-fast product landing page
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_products_landing AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    -- Get primary/thumbnail image
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
     LIMIT 1) as thumbnail_image,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at,
    -- Check for color/size variants
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id) as has_sizes
FROM public.products p
WHERE p.is_active = true
ORDER BY p.created_at DESC, p.id DESC;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_products_landing_id ON public.mv_products_landing (id);

-- Create materialized view for admin products
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_admin_products AS
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
    -- Get thumbnail image
    (SELECT pi.image_url 
     FROM product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
     LIMIT 1) as thumbnail_image,
    -- Count total images
    (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) as total_images,
    -- Check for variants
    EXISTS(SELECT 1 FROM product_colors pc WHERE pc.product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id) as has_sizes,
    -- Count variants
    (SELECT COUNT(*) FROM product_colors pc WHERE pc.product_id = p.id) as colors_count,
    (SELECT COUNT(*) FROM product_sizes ps WHERE ps.product_id = p.id) as sizes_count
FROM public.products p
ORDER BY p.created_at DESC, p.id DESC;

-- Create unique index for admin products view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_admin_products_id ON public.mv_admin_products (id);

-- Refresh the materialized views with initial data
REFRESH MATERIALIZED VIEW public.mv_products_landing;
REFRESH MATERIALIZED VIEW public.mv_admin_products;