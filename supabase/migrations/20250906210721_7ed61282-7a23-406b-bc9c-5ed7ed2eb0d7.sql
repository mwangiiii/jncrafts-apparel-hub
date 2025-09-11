-- Make user_id nullable in stock_alerts table to allow anonymous alerts
ALTER TABLE public.stock_alerts ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to allow anonymous users to create stock alerts
DROP POLICY IF EXISTS "stock_alerts_insert_policy" ON public.stock_alerts;
DROP POLICY IF EXISTS "stock_alerts_select_policy" ON public.stock_alerts;
DROP POLICY IF EXISTS "stock_alerts_update_policy" ON public.stock_alerts;
DROP POLICY IF EXISTS "stock_alerts_delete_policy" ON public.stock_alerts;

-- Allow anyone to insert stock alerts (for anonymous users)
CREATE POLICY "stock_alerts_insert_policy" ON public.stock_alerts
FOR INSERT WITH CHECK (
  -- Admins can insert any alert
  (((auth.jwt() ->> 'role'::text) = 'admin'::text)) OR
  -- Authenticated users can insert alerts for themselves
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  -- Anonymous users can insert alerts with null user_id
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Allow users to view their own alerts, admins to view all
CREATE POLICY "stock_alerts_select_policy" ON public.stock_alerts
FOR SELECT USING (
  -- Admins can view all alerts
  (((auth.jwt() ->> 'role'::text) = 'admin'::text)) OR
  -- Users can view their own alerts
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Allow users to update their own alerts, admins to update all
CREATE POLICY "stock_alerts_update_policy" ON public.stock_alerts
FOR UPDATE USING (
  -- Admins can update all alerts
  (((auth.jwt() ->> 'role'::text) = 'admin'::text)) OR
  -- Users can update their own alerts
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
) WITH CHECK (
  -- Admins can update all alerts
  (((auth.jwt() ->> 'role'::text) = 'admin'::text)) OR
  -- Users can update their own alerts
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Allow users to delete their own alerts, admins to delete all
CREATE POLICY "stock_alerts_delete_policy" ON public.stock_alerts
FOR DELETE USING (
  -- Admins can delete all alerts
  (((auth.jwt() ->> 'role'::text) = 'admin'::text)) OR
  -- Users can delete their own alerts
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);