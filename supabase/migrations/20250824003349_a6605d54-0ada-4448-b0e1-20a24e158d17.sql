-- Add new_arrival_date column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS new_arrival_date TIMESTAMP WITH TIME ZONE;

-- Create function to check if product is a new arrival (within 10 days)
CREATE OR REPLACE FUNCTION public.is_new_arrival(product_new_arrival_date TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT product_new_arrival_date IS NOT NULL 
  AND product_new_arrival_date > (now() - interval '10 days');
$$;