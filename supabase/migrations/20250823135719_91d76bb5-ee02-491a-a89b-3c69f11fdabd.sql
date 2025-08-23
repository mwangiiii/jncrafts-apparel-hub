-- Fix remaining cart_items security issue

-- Update cart_items RLS policies to use the more secure session validation
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view their own cart items - secure" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create cart items - secure" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items - secure" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items - secure" ON public.cart_items;

-- Create secure cart policies that prevent public access
CREATE POLICY "Users can view their own cart items - secure" 
ON public.cart_items 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

CREATE POLICY "Users can create cart items - secure" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

CREATE POLICY "Users can update their own cart items - secure" 
ON public.cart_items 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

CREATE POLICY "Users can delete their own cart items - secure" 
ON public.cart_items 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

-- Explicitly deny public access to cart items
CREATE POLICY "Deny all public access to cart items" 
ON public.cart_items 
FOR ALL 
TO anon
USING (false);