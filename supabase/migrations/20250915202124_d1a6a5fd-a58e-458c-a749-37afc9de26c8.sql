-- Fix product_images RLS policies to allow proper admin access
-- Drop existing problematic policies
DROP POLICY IF EXISTS "product_images_admin_insert" ON product_images;
DROP POLICY IF EXISTS "product_images_admin_update" ON product_images;
DROP POLICY IF EXISTS "product_images_admin_delete" ON product_images;
DROP POLICY IF EXISTS "temp_product_images_select" ON product_images;

-- Create consistent admin policies using the same pattern as other admin tables
CREATE POLICY "product_images_admin_full_access" 
ON product_images 
FOR ALL 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create public read policy for product images (needed for public product display)
CREATE POLICY "product_images_public_read" 
ON product_images 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Also ensure the updated_at trigger exists for product_images
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_product_images_updated_at_trigger ON product_images;
CREATE TRIGGER update_product_images_updated_at_trigger
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_product_images_updated_at();