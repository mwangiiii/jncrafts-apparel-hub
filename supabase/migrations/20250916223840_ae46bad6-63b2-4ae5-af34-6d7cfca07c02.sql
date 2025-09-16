-- Fix RLS policy performance issues and consolidate duplicate policies

-- CATEGORIES TABLE: Drop all existing policies and create optimized ones
DROP POLICY IF EXISTS "categories_admin_all_operations" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_full_access" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "categories_public_view_active" ON public.categories;

-- Create optimized policies for categories
CREATE POLICY "categories_select_policy" ON public.categories
FOR SELECT USING (
  is_admin((SELECT auth.uid())) OR (is_active = true)
);

CREATE POLICY "categories_admin_modify" ON public.categories
FOR ALL USING (
  is_admin((SELECT auth.uid()))
) WITH CHECK (
  is_admin((SELECT auth.uid()))
);

-- PRODUCT_IMAGES TABLE: Drop all existing policies and create optimized ones
DROP POLICY IF EXISTS "product_images_admin_full_access" ON public.product_images;
DROP POLICY IF EXISTS "product_images_admin_write" ON public.product_images;
DROP POLICY IF EXISTS "product_images_public_read" ON public.product_images;

-- Create optimized policies for product_images
CREATE POLICY "product_images_select_policy" ON public.product_images
FOR SELECT USING (true); -- Public read access

CREATE POLICY "product_images_admin_modify" ON public.product_images
FOR ALL USING (
  is_admin((SELECT auth.uid()))
) WITH CHECK (
  is_admin((SELECT auth.uid()))
);

-- PRODUCTS TABLE: Drop all existing policies and create optimized ones  
DROP POLICY IF EXISTS "products_admin_full_access" ON public.products;
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
DROP POLICY IF EXISTS "products_public_view_active" ON public.products;

-- Create optimized policies for products
CREATE POLICY "products_select_policy" ON public.products
FOR SELECT USING (
  is_admin((SELECT auth.uid())) OR (is_active = true)
);

CREATE POLICY "products_admin_modify" ON public.products
FOR ALL USING (
  is_admin((SELECT auth.uid()))
) WITH CHECK (
  is_admin((SELECT auth.uid()))
);