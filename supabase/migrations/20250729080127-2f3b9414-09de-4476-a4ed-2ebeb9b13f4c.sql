-- Create seeded admin users that will automatically get admin access
-- These users will get admin privileges when they sign up

-- Update the handle_new_user function to automatically assign admin role to specific emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Check if this is a seeded admin user
  IF NEW.email IN ('mwangiwanjiku033@gmail.com', 'admin@jncrafts.com') THEN
    -- Grant admin role immediately for seeded admin users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Regular users get customer role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also create some sample discount data for testing
INSERT INTO public.discounts (
  code, name, description, discount_type, discount_value, 
  min_order_amount, max_uses, is_active, start_date, end_date
) VALUES 
  ('WELCOME10', 'Welcome Discount', 'Get 10% off your first order', 'percentage', 10, 50, 100, true, now(), now() + interval '30 days'),
  ('FLASH50', 'Flash Sale', 'Limited time 50% off premium items', 'percentage', 50, 100, 50, true, now(), now() + interval '7 days'),
  ('SAVE25', 'Save $25', 'Get $25 off orders over $150', 'fixed', 25, 150, 200, true, now(), now() + interval '14 days')
ON CONFLICT (code) DO NOTHING;