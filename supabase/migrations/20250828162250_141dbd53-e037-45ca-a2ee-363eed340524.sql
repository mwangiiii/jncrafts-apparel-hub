-- Optimize RLS policies with safer approach to avoid deadlocks
-- First, let's update the existing policies instead of dropping them

-- Update products policies to be more efficient
DROP POLICY IF EXISTS "Everyone can view active products" ON products;
CREATE POLICY "Everyone can view active products" 
ON products FOR SELECT 
TO authenticated, anon
USING (is_active = true);

-- Simplify cart_items policies for better performance
-- Drop the complex policies and create a simple one
DROP POLICY IF EXISTS "cart_authenticated_users_own_data" ON cart_items;
DROP POLICY IF EXISTS "cart_deny_all_other_access" ON cart_items;  
DROP POLICY IF EXISTS "cart_valid_guest_sessions_only" ON cart_items;

-- Create new simplified cart policies
CREATE POLICY "Users can access their own cart items" 
ON cart_items FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Guest sessions can access their cart items"
ON cart_items FOR ALL
TO anon
USING (session_id IS NOT NULL AND validate_guest_session_secure(session_id))
WITH CHECK (session_id IS NOT NULL AND validate_guest_session_secure(session_id));