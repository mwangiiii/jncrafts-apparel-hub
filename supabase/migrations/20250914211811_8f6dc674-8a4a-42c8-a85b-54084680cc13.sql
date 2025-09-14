-- Fix admin access for categories and product creation

-- Drop existing problematic policies for categories
DROP POLICY IF EXISTS "categories_admin_all_operations" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select_active" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_select" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;

-- Drop existing problematic policies for products
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "temp_products_select" ON public.products;

-- Create optimized RLS policies for categories
-- Single policy for admin access (all operations)
CREATE POLICY "categories_admin_full_access" 
ON public.categories 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Single policy for public to view active categories
CREATE POLICY "categories_public_view_active" 
ON public.categories 
FOR SELECT 
TO authenticated, anon
USING (is_active = true);

-- Create optimized RLS policies for products
-- Admin full access policy
CREATE POLICY "products_admin_full_access" 
ON public.products 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Public can view active products
CREATE POLICY "products_public_view_active" 
ON public.products 
FOR SELECT 
TO authenticated, anon
USING (is_active = true);

-- Ensure RLS is enabled on both tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;