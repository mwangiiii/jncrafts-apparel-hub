-- Create trigger to automatically send email notifications on order status changes
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    order_record RECORD;
BEGIN
    -- Only trigger on status updates, not inserts
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Get the complete order details with items
        SELECT 
            o.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'product_name', oi.product_name,
                        'quantity', oi.quantity,
                        'size', oi.size,
                        'color', oi.color,
                        'price', oi.price
                    )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'::json
            ) as order_items
        INTO order_record
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.id = NEW.id
        GROUP BY o.id, o.order_number, o.status, o.total_amount, o.discount_amount, 
                 o.customer_info, o.shipping_address, o.created_at;

        -- Call the order webhook edge function to handle email notifications
        PERFORM
            net.http_post(
                url := current_setting('app.base_url', true) || '/functions/v1/order-webhook',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
                ),
                body := jsonb_build_object(
                    'orderId', NEW.id,
                    'newStatus', NEW.status,
                    'adminId', auth.uid()
                )
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_status_change();

-- Create a function to validate order data before insertion
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the validation trigger
DROP TRIGGER IF EXISTS validate_order_trigger ON orders;
CREATE TRIGGER validate_order_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_order_data();