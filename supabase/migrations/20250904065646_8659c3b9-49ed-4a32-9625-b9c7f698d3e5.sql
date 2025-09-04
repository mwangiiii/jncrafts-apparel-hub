-- Fix missing foreign key relationship and RLS policy issues causing 500 errors

-- Add missing foreign key constraint between product_images and products
ALTER TABLE product_images 
ADD CONSTRAINT product_images_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Drop and recreate RLS policies to use proper is_admin function instead of JWT parsing
-- This prevents potential security issues and function resolution problems

-- Products table policies
DROP POLICY IF EXISTS products_select_policy ON products;
DROP POLICY IF EXISTS products_admin_insert ON products;
DROP POLICY IF EXISTS products_admin_update ON products;
DROP POLICY IF EXISTS products_admin_delete ON products;

CREATE POLICY "products_select_policy" ON products FOR SELECT TO public USING (true);
CREATE POLICY "products_admin_insert" ON products FOR INSERT TO public WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "products_admin_update" ON products FOR UPDATE TO public USING (is_admin(auth.uid()));
CREATE POLICY "products_admin_delete" ON products FOR DELETE TO public USING (is_admin(auth.uid()));

-- Product images table policies  
DROP POLICY IF EXISTS product_images_select_policy ON product_images;
DROP POLICY IF EXISTS product_images_admin_insert ON product_images;
DROP POLICY IF EXISTS product_images_admin_update ON product_images;
DROP POLICY IF EXISTS product_images_admin_delete ON product_images;

CREATE POLICY "product_images_select_policy" ON product_images FOR SELECT TO public USING (true);
CREATE POLICY "product_images_admin_insert" ON product_images FOR INSERT TO public WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "product_images_admin_update" ON product_images FOR UPDATE TO public USING (is_admin(auth.uid()));
CREATE POLICY "product_images_admin_delete" ON product_images FOR DELETE TO public USING (is_admin(auth.uid()));