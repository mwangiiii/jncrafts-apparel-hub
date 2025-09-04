-- Fix RLS policies for orders and invoice_receipts tables to resolve admin access issues

-- Drop existing problematic policies on orders table
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

-- Create new RLS policies for orders table using is_admin function
CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT 
  USING (is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "orders_insert_policy" ON public.orders
  FOR INSERT 
  WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "orders_update_policy" ON public.orders
  FOR UPDATE 
  USING (is_admin(auth.uid()) OR (user_id = auth.uid() AND status = ANY(ARRAY['pending', 'processing'])))
  WITH CHECK (is_admin(auth.uid()) OR (user_id = auth.uid() AND status = ANY(ARRAY['pending', 'processing'])));

CREATE POLICY "orders_delete_policy" ON public.orders
  FOR DELETE 
  USING (is_admin(auth.uid()));

-- Drop existing problematic policies on invoice_receipts table
DROP POLICY IF EXISTS "Admins can manage invoice receipts" ON public.invoice_receipts;

-- Create new RLS policies for invoice_receipts table using is_admin function
CREATE POLICY "invoice_receipts_admin_policy" ON public.invoice_receipts
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Ensure RLS is enabled on both tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_receipts ENABLE ROW LEVEL SECURITY;