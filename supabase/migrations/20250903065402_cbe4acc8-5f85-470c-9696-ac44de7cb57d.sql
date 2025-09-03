-- Fix RLS policies for comprehensive admin access to products and related tables

-- 1. Drop existing conflicting policies on products table
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Users can view active products" ON public.products;

-- 2. Create comprehensive admin policies for products table
CREATE POLICY "Admins have full access to products" ON public.products
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view active products" ON public.products
FOR SELECT 
USING (is_active = true);

-- 3. Ensure sizes table has proper admin INSERT/UPDATE/DELETE access
DROP POLICY IF EXISTS "Admins or public can view sizes" ON public.sizes;

CREATE POLICY "Public can view active sizes" ON public.sizes
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage sizes" ON public.sizes
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 4. Update product_colors policies to use consistent admin check
DROP POLICY IF EXISTS "Admins can manage product colors" ON public.product_colors;
DROP POLICY IF EXISTS "Product colors are publicly readable" ON public.product_colors;

CREATE POLICY "Admins can manage product colors" ON public.product_colors
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view product colors" ON public.product_colors
FOR SELECT 
USING (true);

-- 5. Update product_sizes policies to use consistent admin check
DROP POLICY IF EXISTS "Admins can manage product sizes" ON public.product_sizes;
DROP POLICY IF EXISTS "Product sizes are publicly readable" ON public.product_sizes;

CREATE POLICY "Admins can manage product sizes" ON public.product_sizes
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view product sizes" ON public.product_sizes
FOR SELECT 
USING (true);

-- 6. Update product_images policies to use consistent admin check
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Product images are publicly readable" ON public.product_images;

CREATE POLICY "Admins can manage product images" ON public.product_images
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view product images" ON public.product_images
FOR SELECT 
USING (true);

-- 7. Update colors policies to use consistent admin check
DROP POLICY IF EXISTS "Admins can manage colors" ON public.colors;
DROP POLICY IF EXISTS "Colors are publicly readable" ON public.colors;

CREATE POLICY "Admins can manage colors" ON public.colors
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view colors" ON public.colors
FOR SELECT 
USING (is_active = true);