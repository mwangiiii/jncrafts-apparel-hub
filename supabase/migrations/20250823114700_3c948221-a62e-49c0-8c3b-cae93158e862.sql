-- Fix security issues with customer email exposure and strengthen RLS policies

-- 1. First, let's remove the plain text email column from stock_alerts table
-- and ensure only hashed emails are stored
ALTER TABLE public.stock_alerts DROP COLUMN IF EXISTS email;

-- 2. Make email_hash column required and add better validation
ALTER TABLE public.stock_alerts 
  ALTER COLUMN email_hash SET NOT NULL,
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
  
  -- Hash the email
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
  
  -- Create new stock alert
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

-- 5. Strengthen RLS policies - remove any potential gaps
DROP POLICY IF EXISTS "Users can view only their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Authenticated users can create their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Users can update their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Users can delete their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Authenticated admins can view stock alerts" ON public.stock_alerts;

-- Create more restrictive RLS policies
CREATE POLICY "Users can view only their own stock alerts - strict" 
ON public.stock_alerts 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

CREATE POLICY "Admins can view all stock alerts - strict" 
ON public.stock_alerts 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND is_admin(auth.uid())
);

CREATE POLICY "Users can create their own stock alerts - strict" 
ON public.stock_alerts 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND user_id IS NOT NULL
);

CREATE POLICY "Users can update their own stock alerts - strict" 
ON public.stock_alerts 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
  AND user_id IS NOT NULL
);

CREATE POLICY "Users can delete their own stock alerts - strict" 
ON public.stock_alerts 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- 6. Ensure no public access to stock alerts
CREATE POLICY "Deny all public access to stock alerts" 
ON public.stock_alerts 
FOR ALL 
TO anon
USING (false);

-- 7. Fix the cart_items session security issue
-- Add better session validation
CREATE OR REPLACE FUNCTION public.validate_guest_session_secure(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Additional validation: session ID should be sufficiently long and complex
  IF p_session_id IS NULL OR length(p_session_id) < 32 THEN
    RETURN false;
  END IF;
  
  -- Check if session exists and hasn't expired
  RETURN EXISTS (
    SELECT 1 
    FROM public.guest_sessions 
    WHERE session_id = p_session_id 
      AND expires_at > now()
      AND last_accessed > (now() - interval '7 days') -- Additional staleness check
  );
END;
$$;

-- Update cart_items RLS policies to use the more secure session validation
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

CREATE POLICY "Users can view their own cart items - secure" 
ON public.cart_items 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

CREATE POLICY "Users can create cart items - secure" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

CREATE POLICY "Users can update their own cart items - secure" 
ON public.cart_items 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

CREATE POLICY "Users can delete their own cart items - secure" 
ON public.cart_items 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session_secure(session_id))
);

-- 8. Add audit logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_stock_alert_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log access to stock alerts for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    PERFORM public.log_admin_data_access(
      'stock_alert_access',
      'stock_alerts',
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object('operation', TG_OP, 'timestamp', now())
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the audit trigger
CREATE TRIGGER stock_alert_audit_trigger
  AFTER SELECT ON public.stock_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stock_alert_access();