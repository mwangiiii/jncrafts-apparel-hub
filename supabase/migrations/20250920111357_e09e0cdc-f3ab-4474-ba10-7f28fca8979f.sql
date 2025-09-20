-- Fix RLS policies for cart_items to properly handle guest sessions
DROP POLICY IF EXISTS "cart_items_select_policy" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_insert_policy" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_update_policy" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_delete_policy" ON public.cart_items;

-- Create new policies that properly handle both authenticated users and guest sessions
CREATE POLICY "cart_items_select_policy" ON public.cart_items
FOR SELECT
USING (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "cart_items_insert_policy" ON public.cart_items
FOR INSERT
WITH CHECK (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "cart_items_update_policy" ON public.cart_items
FOR UPDATE
USING (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "cart_items_delete_policy" ON public.cart_items
FOR DELETE
USING (
  (user_id = auth.uid()) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);