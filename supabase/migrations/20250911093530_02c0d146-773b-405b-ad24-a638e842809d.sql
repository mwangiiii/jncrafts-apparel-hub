-- Fix categories RLS policies to use proper admin function instead of JWT role
DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON categories;  
DROP POLICY IF EXISTS "categories_admin_update" ON categories;

-- Create proper admin policies using is_admin function
CREATE POLICY "categories_admin_all_operations" 
ON categories 
FOR ALL 
TO authenticated
USING (is_admin(auth.uid()) = true)
WITH CHECK (is_admin(auth.uid()) = true);

-- Ensure public can read active categories
DROP POLICY IF EXISTS "categories anon select" ON categories;
CREATE POLICY "categories_public_select" 
ON categories 
FOR SELECT 
TO public
USING (is_active = true);