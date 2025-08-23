-- Final comprehensive cart security fix

-- First ensure RLS is enabled on cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol_name text;
BEGIN
    -- Get all policy names for cart_items table
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'cart_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.cart_items', pol_name);
    END LOOP;
END $$;

-- Create completely new restrictive policies
CREATE POLICY "cart_authenticated_users_own_data" 
ON public.cart_items 
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

CREATE POLICY "cart_valid_guest_sessions_only" 
ON public.cart_items 
FOR ALL
TO anon
USING (
  auth.uid() IS NULL 
  AND session_id IS NOT NULL 
  AND validate_guest_session_secure(session_id)
)
WITH CHECK (
  auth.uid() IS NULL 
  AND session_id IS NOT NULL 
  AND validate_guest_session_secure(session_id)
);

-- Ensure no other access is possible
CREATE POLICY "cart_deny_all_other_access" 
ON public.cart_items 
FOR ALL
TO public
USING (false);