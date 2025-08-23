-- Fix security issues with customer email exposure and strengthen RLS policies

-- 1. Remove the plain text email column from stock_alerts table to prevent email exposure
ALTER TABLE public.stock_alerts DROP COLUMN IF EXISTS email;

-- 2. Make email_hash column required and add validation
ALTER TABLE public.stock_alerts 
  ALTER COLUMN email_hash SET NOT NULL;

-- Add constraint to validate email hash format (64-character hex string)
ALTER TABLE public.stock_alerts 
  ADD CONSTRAINT email_hash_format_check CHECK (length(email_hash) = 64 AND email_hash ~ '^[a-f0-9]+$');

-- 3. Create a secure function for stock alert creation that only stores hashed emails
CREATE OR REPLACE FUNCTION public.create_stock_alert_secure(
  p_product_id uuid,
  p_email text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_id uuid;
  hashed_email text;
BEGIN
  -- Validate inputs
  IF p_product_id IS NULL OR p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Product ID and email are required';
  END IF;
  
  -- Validate email format
  IF p_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Hash the email using existing function
  hashed_email := public.hash_email(p_email);
  
  -- Check if alert already exists for this product and email hash
  SELECT id INTO alert_id
  FROM public.stock_alerts 
  WHERE product_id = p_product_id 
    AND email_hash = hashed_email
    AND user_id = auth.uid();
  
  -- If alert exists, return existing ID
  IF alert_id IS NOT NULL THEN
    RETURN alert_id;
  END IF;
  
  -- Create new stock alert with hashed email only
  INSERT INTO public.stock_alerts (user_id, product_id, email_hash)
  VALUES (auth.uid(), p_product_id, hashed_email)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;

-- 4. Create a secure function to verify email for stock alerts without exposing data
CREATE OR REPLACE FUNCTION public.verify_stock_alert_email(
  p_alert_id uuid,
  p_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stored_hash text;
BEGIN
  -- Only allow users to verify their own alerts or admins
  SELECT email_hash INTO stored_hash
  FROM public.stock_alerts 
  WHERE id = p_alert_id 
    AND (user_id = auth.uid() OR is_admin(auth.uid()));
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN public.verify_email_match(stored_hash, p_email);
END;
$$;