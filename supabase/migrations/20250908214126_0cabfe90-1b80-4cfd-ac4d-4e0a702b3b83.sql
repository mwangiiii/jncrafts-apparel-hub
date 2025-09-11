-- Create order_status table with predefined statuses
CREATE TABLE public.order_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(50) NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on order_status
ALTER TABLE public.order_status ENABLE ROW LEVEL SECURITY;

-- Create policies for order_status
CREATE POLICY "order_status_select_policy" 
ON public.order_status 
FOR SELECT 
USING (is_active = true OR ((auth.jwt() ->> 'role'::text) = 'admin'::text));

CREATE POLICY "order_status_admin_insert" 
ON public.order_status 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "order_status_admin_update" 
ON public.order_status 
FOR UPDATE 
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "order_status_admin_delete" 
ON public.order_status 
FOR DELETE 
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Insert predefined order statuses
INSERT INTO public.order_status (name, display_name, description, display_order) VALUES
('pending', 'Pending', 'Order has been placed and is awaiting processing', 1),
('confirmed', 'Confirmed', 'Order has been confirmed and payment verified', 2),
('processing', 'Processing', 'Order is being prepared for shipment', 3),
('packed', 'Packed', 'Order has been packed and is ready for pickup/delivery', 4),
('shipped', 'Shipped', 'Order has been handed over to delivery partner', 5),
('out_for_delivery', 'Out for Delivery', 'Order is out for delivery to customer', 6),
('delivered', 'Delivered', 'Order has been successfully delivered to customer', 7),
('cancelled', 'Cancelled', 'Order has been cancelled', 8),
('refunded', 'Refunded', 'Order has been refunded to customer', 9),
('failed', 'Failed', 'Order processing or delivery failed', 10);

-- Add status_id column to orders table
ALTER TABLE public.orders ADD COLUMN status_id uuid;

-- Update existing orders to reference the new status table
UPDATE public.orders SET status_id = (
  SELECT id FROM public.order_status WHERE name = orders.status
);

-- Make status_id NOT NULL after updating existing records
ALTER TABLE public.orders ALTER COLUMN status_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.orders ADD CONSTRAINT fk_orders_status_id 
FOREIGN KEY (status_id) REFERENCES public.order_status(id);

-- Create index for performance
CREATE INDEX idx_orders_status_id ON public.orders(status_id);

-- Create a view for easy order querying with status details
CREATE VIEW public.orders_with_status AS
SELECT 
  o.*,
  os.name as status_name,
  os.display_name as status_display_name,
  os.description as status_description
FROM public.orders o
INNER JOIN public.order_status os ON o.status_id = os.id;

-- Enable RLS on the view (inherits from underlying tables)
ALTER VIEW public.orders_with_status SET (security_invoker = on);

-- Create function to get valid status transitions
CREATE OR REPLACE FUNCTION public.get_valid_status_transitions(current_status_name text)
RETURNS TABLE(id uuid, name varchar, display_name text, description text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Define valid transitions based on business logic
  RETURN QUERY
  CASE current_status_name
    WHEN 'pending' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('confirmed', 'cancelled') AND os.is_active = true
    WHEN 'confirmed' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('processing', 'cancelled') AND os.is_active = true
    WHEN 'processing' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('packed', 'cancelled') AND os.is_active = true
    WHEN 'packed' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('shipped', 'cancelled') AND os.is_active = true
    WHEN 'shipped' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('out_for_delivery', 'delivered') AND os.is_active = true
    WHEN 'out_for_delivery' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('delivered', 'failed') AND os.is_active = true
    WHEN 'delivered' THEN
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE os.name IN ('refunded') AND os.is_active = true
    ELSE
      -- For cancelled, failed, refunded - no further transitions typically allowed
      SELECT os.id, os.name, os.display_name, os.description 
      FROM order_status os 
      WHERE FALSE; -- Return empty result
  END CASE;
END;
$$;

-- Update the existing trigger to work with new status structure
CREATE OR REPLACE FUNCTION public.handle_order_status_change_normalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_status_name text;
    new_status_name text;
BEGIN
    -- Only trigger on status updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.status_id != NEW.status_id THEN
        -- Get status names for logging
        SELECT name INTO old_status_name FROM order_status WHERE id = OLD.status_id;
        SELECT name INTO new_status_name FROM order_status WHERE id = NEW.status_id;
        
        -- Log the status change for debugging
        INSERT INTO admin_audit_log (
            admin_user_id,
            action,
            table_name,
            record_id,
            accessed_data
        ) VALUES (
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
            'status_change',
            'orders',
            NEW.id,
            jsonb_build_object(
                'old_status', old_status_name,
                'new_status', new_status_name,
                'order_number', NEW.order_number
            )
        );
        
        -- Note: Email notification will be handled by the application layer
        -- to avoid dependency on external HTTP calls from triggers
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS handle_order_status_change_trigger ON public.orders;
CREATE TRIGGER handle_order_status_change_normalized_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change_normalized();

-- Add updated_at trigger for order_status table
CREATE TRIGGER update_order_status_updated_at
  BEFORE UPDATE ON public.order_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();