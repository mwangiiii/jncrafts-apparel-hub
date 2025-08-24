-- Fix security issue: Update function with proper search path
CREATE OR REPLACE FUNCTION public.is_new_arrival(product_new_arrival_date TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT product_new_arrival_date IS NOT NULL 
  AND product_new_arrival_date > (now() - interval '10 days');
$$;