-- Further restrict cart_items access to close security gaps
-- Remove overly permissive policies and create more restrictive ones

DROP POLICY IF EXISTS "Deny public access to cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Valid guest sessions can manage their cart items" ON public.cart_items;

-- Create highly restrictive policies that deny all access by default

-- Authenticated users can only access their own cart items (never null user_id)
CREATE POLICY "Authenticated users own cart access only"
ON public.cart_items
FOR ALL
TO authenticated
USING (
  user_id IS NOT NULL 
  AND user_id = auth.uid()
  AND session_id IS NULL
)
WITH CHECK (
  user_id IS NOT NULL 
  AND user_id = auth.uid()
  AND session_id IS NULL
);

-- Anonymous users can only access valid guest sessions (never has user_id)
CREATE POLICY "Anonymous guest session access only"
ON public.cart_items
FOR ALL
TO anon
USING (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND validate_guest_session_secure(session_id)
)
WITH CHECK (
  user_id IS NULL 
  AND session_id IS NOT NULL 
  AND validate_guest_session_secure(session_id)
);

-- Ensure no other access is possible
CREATE POLICY "Deny all other cart access"
ON public.cart_items
FOR ALL
TO public
USING (false);