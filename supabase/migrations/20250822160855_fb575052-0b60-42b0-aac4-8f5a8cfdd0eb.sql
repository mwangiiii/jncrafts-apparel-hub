-- Add delivery_details column to orders table to store delivery information
ALTER TABLE public.orders 
ADD COLUMN delivery_details jsonb;