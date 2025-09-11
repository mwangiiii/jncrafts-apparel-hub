-- Ensure RLS is enabled on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Replace existing admin policy that relies on JWT role with a robust admin check
DROP POLICY IF EXISTS "categories_admin_all_operations" ON public.categories;

-- Allow public (unauthenticated and authenticated users) to read active categories
CREATE POLICY "categories_public_select_active"
ON public.categories
AS PERMISSIVE
FOR SELECT
TO public
USING (is_active = true);

-- Grant full CRUD to admins based on the is_admin(auth.uid()) function
CREATE POLICY "categories_admin_all_operations"
ON public.categories
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));