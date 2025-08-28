-- Optimize RLS policies for products table
-- Instead of complex policies, use simple ones:

DROP POLICY IF EXISTS "products_select_policy" ON products;
CREATE POLICY "products_select_policy" 
ON products FOR SELECT 
TO authenticated, anon
USING (is_active = true);

-- For cart_items, ensure user can only see their own items
DROP POLICY IF EXISTS "cart_items_select_policy" ON cart_items;
CREATE POLICY "cart_items_select_policy" 
ON cart_items FOR SELECT 
TO authenticated
USING (user_id = auth.uid());