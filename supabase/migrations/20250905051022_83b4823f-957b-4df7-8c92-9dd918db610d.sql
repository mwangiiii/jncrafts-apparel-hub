-- Add size chart fields to products table
ALTER TABLE public.products 
ADD COLUMN show_jacket_size_chart boolean DEFAULT false,
ADD COLUMN show_pants_size_chart boolean DEFAULT false;