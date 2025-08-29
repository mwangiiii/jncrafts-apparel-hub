-- Fix security definer view issue properly
-- Apply security_invoker only to regular views, not materialized views

-- Drop and recreate profiles_secure view with security_invoker
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure 
WITH (security_invoker=on) AS
SELECT 
  p.id,
  p.user_id,
  p.created_at,
  p.updated_at,
  -- Full name: show based on access level  
  CASE 
    WHEN p.user_id = auth.uid() THEN p.full_name -- User sees own full name
    WHEN is_admin(auth.uid()) THEN p.full_name -- Admin sees full name (but access is logged)
    ELSE NULL
  END as full_name,
  -- Phone: masked for admin access
  CASE 
    WHEN p.user_id = auth.uid() THEN p.phone -- User sees own phone
    WHEN is_admin(auth.uid()) THEN public.mask_phone(p.phone) -- Admin sees masked phone
    ELSE NULL
  END as phone,
  -- Address: masked for admin access
  CASE 
    WHEN p.user_id = auth.uid() THEN p.address -- User sees own address
    WHEN is_admin(auth.uid()) THEN public.mask_address(p.address) -- Admin sees masked address
    ELSE NULL
  END as address
FROM public.profiles p;

-- Recreate the materialized view without security_invoker (not supported for materialized views)
-- But ensure it only contains non-sensitive data
DROP MATERIALIZED VIEW IF EXISTS public.mv_products_landing CASCADE;

CREATE MATERIALIZED VIEW public.mv_products_landing AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.category,
    p.stock_quantity,
    p.new_arrival_date,
    p.created_at,
    -- Get primary image or first image as thumbnail
    (SELECT pi.image_url 
     FROM public.product_images pi 
     WHERE pi.product_id = p.id 
     ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC 
     LIMIT 1) as thumbnail_image,
    -- Quick checks for variants
    EXISTS(SELECT 1 FROM public.product_colors WHERE product_id = p.id) as has_colors,
    EXISTS(SELECT 1 FROM public.product_sizes WHERE product_id = p.id) as has_sizes
FROM public.products p
WHERE p.is_active = true;

-- Create unique index for concurrent refreshes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_products_landing_id 
ON public.mv_products_landing (id);

-- Grant access to the views
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.mv_products_landing TO authenticated, anon;

-- Add comments documenting the security approach
COMMENT ON VIEW public.profiles_secure IS 'Secure view for customer profiles with data masking for admin access and security_invoker to respect RLS policies.';
COMMENT ON MATERIALIZED VIEW public.mv_products_landing IS 'Optimized materialized view for product listings - contains only non-sensitive public product data.';