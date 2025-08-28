-- Fix cart_items security issue: Ensure cart data is only accessible to owners
-- Drop existing policies to recreate them with better security

DROP POLICY IF EXISTS "Guest sessions can access their cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can access their own cart items" ON public.cart_items;

-- Create comprehensive RLS policies for cart_items that explicitly deny public access

-- Deny all public access to cart items (default deny)
CREATE POLICY "Deny public access to cart items"
ON public.cart_items
FOR ALL
TO public
USING (false);

-- Allow authenticated users to access only their own cart items
CREATE POLICY "Users can manage their own cart items"
ON public.cart_items
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow valid guest sessions to access only their own cart items
CREATE POLICY "Valid guest sessions can manage their cart items"
ON public.cart_items
FOR ALL
TO authenticated, anon
USING (
  (session_id IS NOT NULL) 
  AND (user_id IS NULL) 
  AND validate_guest_session_secure(session_id)
)
WITH CHECK (
  (session_id IS NOT NULL) 
  AND (user_id IS NULL) 
  AND validate_guest_session_secure(session_id)
);

-- Ensure RLS is enabled on cart_items table
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;