-- Create stock_alerts table for users to sign up for notifications
CREATE TABLE public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(email, product_id)
);

-- Enable RLS
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create stock alerts" 
ON public.stock_alerts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own stock alerts" 
ON public.stock_alerts 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all stock alerts" 
ON public.stock_alerts 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create function to check and send stock alerts when products are restocked
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
CREATE TRIGGER stock_alert_check
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_alerts();