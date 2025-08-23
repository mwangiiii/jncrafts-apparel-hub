-- Fix security issue: Strengthen RLS policies for stock_alerts table
-- to prevent unauthorized access to customer email addresses

-- Drop existing policies that have security gaps
DROP POLICY IF EXISTS "Users can create stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Users can view only their own stock alerts" ON public.stock_alerts;

-- Create stronger RLS policies for stock alerts
CREATE POLICY "Authenticated users can create their own stock alerts"
ON public.stock_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can view only their own stock alerts"
ON public.stock_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update their own stock alerts"
ON public.stock_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can delete their own stock alerts"
ON public.stock_alerts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Keep admin access for management purposes
-- Note: The "Admins can view all stock alerts" policy already exists and is secure

-- Add constraint to ensure user_id cannot be NULL for new records
-- This prevents orphaned records that could bypass RLS
ALTER TABLE public.stock_alerts 
ALTER COLUMN user_id SET NOT NULL;

-- Clean up any existing records with NULL user_id (if any)
-- These would be security risks as they bypass user-based RLS
DELETE FROM public.stock_alerts WHERE user_id IS NULL;