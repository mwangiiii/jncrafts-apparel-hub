-- Fix the product_images RLS policies that are causing 500 errors
-- Simplify to eliminate any function call issues

-- First, let's check if the user has admin role by simplifying the check
DROP POLICY IF EXISTS "product_images_select_policy" ON public.product_images;
DROP POLICY IF EXISTS "product_images_insert_policy" ON public.product_images;
DROP POLICY IF EXISTS "product_images_update_policy" ON public.product_images;
DROP POLICY IF EXISTS "product_images_delete_policy" ON public.product_images;

-- Create simple, robust policies for product_images
-- Allow public read access to product images
CREATE POLICY "product_images_public_read" ON public.product_images
FOR SELECT USING (true);

-- Allow authenticated users with admin role to modify
CREATE POLICY "product_images_admin_insert" ON public.product_images
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
);

CREATE POLICY "product_images_admin_update" ON public.product_images
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
);

CREATE POLICY "product_images_admin_delete" ON public.product_images
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'admin')
);