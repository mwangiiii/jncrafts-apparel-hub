-- FORCE FIX: Admin Products Panel - Part 1 (Policies and Basic Setup)

-- 1. Fix guest_sessions RLS policy
DROP POLICY IF EXISTS "Allow creating guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Allow system to create guest sessions" ON public.guest_sessions;

CREATE POLICY "System can manage guest sessions" 
ON public.guest_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Add critical performance indexes (without CONCURRENTLY)
DROP INDEX IF EXISTS idx_products_admin_list;
DROP INDEX IF EXISTS idx_product_images_primary;
DROP INDEX IF EXISTS idx_product_images_count;
DROP INDEX IF EXISTS idx_product_colors_exists;
DROP INDEX IF EXISTS idx_product_sizes_exists;

CREATE INDEX idx_products_admin_list ON public.products(created_at DESC, id DESC) WHERE is_active = true;
CREATE INDEX idx_product_images_primary ON public.product_images(product_id, is_primary DESC, display_order ASC) WHERE is_primary = true;
CREATE INDEX idx_product_images_count ON public.product_images(product_id);
CREATE INDEX idx_product_colors_exists ON public.product_colors(product_id);
CREATE INDEX idx_product_sizes_exists ON public.product_sizes(product_id);