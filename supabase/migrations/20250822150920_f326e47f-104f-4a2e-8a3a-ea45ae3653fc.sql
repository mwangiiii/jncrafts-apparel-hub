-- Fix security vulnerability in stock_alerts table
-- Remove ability for users to view anonymous stock alerts (user_id IS NULL)
-- This prevents harvesting of email addresses from anonymous stock alert signups

-- Drop the existing policy that allows viewing NULL user_id alerts
DROP POLICY IF EXISTS "Users can view their own stock alerts" ON public.stock_alerts;

-- Create a more secure policy that only allows users to view their own alerts
CREATE POLICY "Users can view only their own stock alerts" 
ON public.stock_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Keep the admin policy unchanged for management purposes
-- The "Admins can view all stock alerts" policy remains as-is

-- Note: The INSERT policy remains unchanged to allow anonymous stock alert creation
-- but viewing is now restricted to the actual owner or admins only