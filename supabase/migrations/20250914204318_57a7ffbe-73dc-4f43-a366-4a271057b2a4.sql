-- Fix RLS policy performance and multiple permissive policy issues

-- Drop existing problematic policies for categories
DROP POLICY IF EXISTS "categories_admin_all_operations" ON public.categories;
DROP POLICY IF EXISTS "categories_public_select_active" ON public.categories;

-- Create optimized categories policies with proper performance
-- Single policy for SELECT that handles both admin and public access
CREATE POLICY "categories_select_optimized" ON public.categories
FOR SELECT USING (
  (SELECT is_admin(auth.uid())) OR is_active = true
);

-- Admin policies for other operations (optimized with SELECT wrapper)
CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT WITH CHECK (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE USING (
  (SELECT is_admin(auth.uid()))
) WITH CHECK (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE USING (
  (SELECT is_admin(auth.uid()))
);

-- Fix products RLS policies to use is_admin() function consistently
-- Drop existing problematic product policies
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

-- Create optimized product policies
CREATE POLICY "products_admin_insert" ON public.products
FOR INSERT WITH CHECK (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "products_admin_update" ON public.products
FOR UPDATE USING (
  (SELECT is_admin(auth.uid()))
) WITH CHECK (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "products_admin_delete" ON public.products
FOR DELETE USING (
  (SELECT is_admin(auth.uid()))
);