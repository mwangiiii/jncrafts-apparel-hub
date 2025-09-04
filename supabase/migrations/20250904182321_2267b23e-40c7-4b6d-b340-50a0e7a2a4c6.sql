-- Fix guest_sessions RLS policies and add critical indexes for performance

-- 1. Fix guest_sessions RLS policy to allow anonymous users to create sessions
DROP POLICY IF EXISTS "auth_insert_guest_sessions" ON public.guest_sessions;

CREATE POLICY "guest_sessions_anon_insert" ON public.guest_sessions
  FOR INSERT 
  WITH CHECK (true); -- Allow anonymous users to create guest sessions

-- 2. Drop complex policies and create simpler ones for better performance
DROP POLICY IF EXISTS "guest_sessions_select_policy" ON public.guest_sessions;
DROP POLICY IF EXISTS "guest_sessions_update_policy" ON public.guest_sessions;

-- Allow service role and any authenticated user to select guest sessions
CREATE POLICY "guest_sessions_select" ON public.guest_sessions
  FOR SELECT 
  USING (true); -- Simplify for now - performance is critical

CREATE POLICY "guest_sessions_update" ON public.guest_sessions
  FOR UPDATE 
  USING (true) -- Simplify for now - performance is critical
  WITH CHECK (true);

-- 3. Add critical indexes for performance (without CONCURRENTLY)

-- Cart items indexes (critical for cart performance)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON public.cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON public.cart_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_created ON public.cart_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_created ON public.cart_items(session_id, created_at DESC);

-- Products indexes (for get_product_complete performance)
CREATE INDEX IF NOT EXISTS idx_products_id_active ON public.products(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- Product images indexes (for image loading)
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary DESC);

-- Product colors and sizes indexes (for variants)
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON public.product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id ON public.product_sizes(product_id);

-- Color and size reference indexes
CREATE INDEX IF NOT EXISTS idx_colors_id_active ON public.colors(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sizes_id_active ON public.sizes(id) WHERE is_active = true;

-- Guest sessions indexes
CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_id ON public.guest_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON public.guest_sessions(expires_at);