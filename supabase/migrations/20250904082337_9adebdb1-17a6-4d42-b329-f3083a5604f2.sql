-- Fix RLS policies for categories table to allow admin management

-- Add admin policies for categories table
CREATE POLICY "categories_admin_insert" ON public.categories
  FOR INSERT 
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "categories_admin_update" ON public.categories
  FOR UPDATE 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "categories_admin_delete" ON public.categories
  FOR DELETE 
  USING (is_admin(auth.uid()));