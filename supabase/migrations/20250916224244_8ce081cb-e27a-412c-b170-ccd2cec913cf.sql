-- Fix overlapping RLS policies by creating separate policies for each action

-- CATEGORIES TABLE: Remove overlapping policies and create specific ones
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_modify" ON public.categories;

-- Create non-overlapping policies for categories
CREATE POLICY "categories_select_policy" ON public.categories
FOR SELECT USING (
  is_admin((SELECT auth.uid())) OR (is_active = true)
);

CREATE POLICY "categories_insert_policy" ON public.categories
FOR INSERT WITH CHECK (
  is_admin((SELECT auth.uid()))
);

CREATE POLICY "categories_update_policy" ON public.categories
FOR UPDATE USING (
  is_admin((SELECT auth.uid()))
) WITH CHECK (
  is_admin((SELECT auth.uid()))
);

CREATE POLICY "categories_delete_policy" ON public.categories
FOR DELETE USING (
  is_admin((SELECT auth.uid()))
);

-- PRODUCT_IMAGES TABLE: Remove overlapping policies and create specific ones
DROP POLICY IF EXISTS "product_images_select_policy" ON public.product_images;
DROP POLICY IF EXISTS "product_images_admin_modify" ON public.product_images;

-- Create non-overlapping policies for product_images
CREATE POLICY "product_images_select_policy" ON public.product_images
FOR SELECT USING (true); -- Public read access

CREATE POLICY "product_images_insert_policy" ON public.product_images
FOR INSERT WITH CHECK (
  is_admin((SELECT auth.uid()))
);

CREATE POLICY "product_images_update_policy" ON public.product_images
FOR UPDATE USING (
  is_admin((SELECT auth.uid()))
) WITH CHECK (
  is_admin((SELECT auth.uid()))
);

CREATE POLICY "product_images_delete_policy" ON public.product_images
FOR DELETE USING (
  is_admin((SELECT auth.uid()))
);

-- PRODUCTS TABLE: Remove overlapping policies and create specific ones
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "products_admin_modify" ON public.products;

-- Create non-overlapping policies for products
CREATE POLICY "products_select_policy" ON public.products
FOR SELECT USING (
  is_admin((SELECT auth.uid())) OR (is_active = true)
);

CREATE POLICY "products_insert_policy" ON public.products
FOR INSERT WITH CHECK (
  is_admin((SELECT auth.uid()))
);

CREATE POLICY "products_update_policy" ON public.products
FOR UPDATE USING (
  is_admin((SELECT auth.uid()))
) WITH CHECK (
  is_admin((SELECT auth.uid()))
);

CREATE POLICY "products_delete_policy" ON public.products
FOR DELETE USING (
  is_admin((SELECT auth.uid()))
);