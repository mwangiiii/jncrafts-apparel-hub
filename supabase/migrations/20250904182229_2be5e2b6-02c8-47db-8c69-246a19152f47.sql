-- Fix guest_sessions RLS policies and add critical indexes for performance

-- 1. Fix guest_sessions RLS policy to allow anonymous users to create sessions
DROP POLICY IF EXISTS "auth_insert_guest_sessions" ON public.guest_sessions;

CREATE POLICY "guest_sessions_anon_insert" ON public.guest_sessions
  FOR INSERT 
  WITH CHECK (true); -- Allow anonymous users to create guest sessions

-- 2. Add critical indexes for performance optimization

-- Cart items indexes (critical for cart performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_session_id ON public.cart_items(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_created_at ON public.cart_items(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_created ON public.cart_items(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_session_created ON public.cart_items(session_id, created_at DESC);

-- Products indexes (for get_product_complete performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_id_active ON public.products(id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- Product images indexes (for image loading)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_primary ON public.product_images(product_id, is_primary DESC);

-- Product colors and sizes indexes (for variants)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_colors_product_id ON public.product_colors(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_sizes_product_id ON public.product_sizes(product_id);

-- Color and size reference indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colors_id_active ON public.colors(id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sizes_id_active ON public.sizes(id) WHERE is_active = true;

-- Guest sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_sessions_session_id ON public.guest_sessions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guest_sessions_expires_at ON public.guest_sessions(expires_at);

-- 3. Update the guest_sessions validation to be more efficient
-- Drop the complex policy and create a simpler one
DROP POLICY IF EXISTS "guest_sessions_select_policy" ON public.guest_sessions;
DROP POLICY IF EXISTS "guest_sessions_update_policy" ON public.guest_sessions;

-- Allow service role and session owners to select/update
CREATE POLICY "guest_sessions_select" ON public.guest_sessions
  FOR SELECT 
  USING (
    (current_setting('role', true) = 'service_role') OR 
    (session_id = current_setting('request.headers', true)::json->>'session_id')
  );

CREATE POLICY "guest_sessions_update" ON public.guest_sessions
  FOR UPDATE 
  USING (
    (current_setting('role', true) = 'service_role') OR 
    (session_id = current_setting('request.headers', true)::json->>'session_id')
  )
  WITH CHECK (
    (current_setting('role', true) = 'service_role') OR 
    (session_id = current_setting('request.headers', true)::json->>'session_id')
  );