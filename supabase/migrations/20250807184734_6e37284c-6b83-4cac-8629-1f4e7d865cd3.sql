-- Fix the search path security warning for the check_stock_alerts function
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If stock quantity changed from 0 to positive, trigger alerts
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    -- Mark alerts as needing notification (will be handled by edge function)
    UPDATE public.stock_alerts 
    SET notified = FALSE 
    WHERE product_id = NEW.id AND notified = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;