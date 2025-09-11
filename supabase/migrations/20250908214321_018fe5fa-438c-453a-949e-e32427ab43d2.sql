-- Fix security definer view warning by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.orders_with_status;

-- Create view without security_invoker setting (inherits from underlying tables naturally)
CREATE VIEW public.orders_with_status AS
SELECT 
  o.*,
  os.name as status_name,
  os.display_name as status_display_name,
  os.description as status_description
FROM public.orders o
INNER JOIN public.order_status os ON o.status_id = os.id;