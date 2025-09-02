-- Fix security issues from the linter

-- Update functions to have proper search_path settings
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    order_record RECORD;
BEGIN
    -- Only trigger on status updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
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
                'old_status', OLD.status,
                'new_status', NEW.status,
                'order_number', NEW.order_number
            )
        );
        
        -- Note: Email notification will be handled by the application layer
        -- to avoid dependency on external HTTP calls from triggers
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Update validation function with proper search_path
CREATE OR REPLACE FUNCTION validate_order_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate required fields
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required for order creation';
    END IF;
    
    IF NEW.customer_info IS NULL OR 
       NEW.customer_info->>'fullName' IS NULL OR 
       NEW.customer_info->>'email' IS NULL THEN
        RAISE EXCEPTION 'Complete customer information is required';
    END IF;
    
    IF NEW.shipping_address IS NULL OR
       NEW.shipping_address->>'address' IS NULL OR
       NEW.shipping_address->>'city' IS NULL THEN
        RAISE EXCEPTION 'Complete shipping address is required';
    END IF;
    
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE EXCEPTION 'Valid total amount is required';
    END IF;
    
    -- Generate order number if not provided
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Remove materialized views from API access
REVOKE ALL ON mv_admin_products FROM anon, authenticated;
REVOKE ALL ON mv_products_landing FROM anon, authenticated;

-- Grant access only through functions
GRANT EXECUTE ON FUNCTION get_admin_products_ultra_fast TO authenticated;
GRANT EXECUTE ON FUNCTION get_products_ultra_fast TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_featured_products_ultra_fast TO anon, authenticated;