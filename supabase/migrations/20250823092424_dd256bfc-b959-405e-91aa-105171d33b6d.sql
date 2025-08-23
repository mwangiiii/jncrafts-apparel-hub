-- SECURITY FIX: Secure stock_alerts table against email data theft
-- This addresses the critical vulnerability where customer emails could be stolen

-- Step 1: Drop existing vulnerable admin policy
DROP POLICY IF EXISTS "Admins can view all stock alerts" ON public.stock_alerts;

-- Step 2: Create secure admin policy restricted to authenticated users only
CREATE POLICY "Authenticated admins can view stock alerts"
ON public.stock_alerts
FOR SELECT
TO authenticated  -- CRITICAL: Only authenticated users, not public
USING (
  auth.uid() IS NOT NULL AND 
  is_admin(auth.uid())
);

-- Step 3: Add audit logging table for admin access to sensitive data
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  accessed_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 4: Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Create audit log policies (only admins can view their own audit trail)
CREATE POLICY "Admins can view their own audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  admin_user_id = auth.uid() AND
  is_admin(auth.uid())
);

CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  admin_user_id = auth.uid()
);

-- Step 6: Add email encryption/hashing function
CREATE OR REPLACE FUNCTION public.hash_email(email_address text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Use pgcrypto extension for secure hashing
  -- This allows for email verification while protecting the actual email
  RETURN encode(digest(lower(trim(email_address)), 'sha256'), 'hex');
END;
$$;

-- Step 7: Add email verification function (for matching without exposing emails)
CREATE OR REPLACE FUNCTION public.verify_email_match(stored_hash text, input_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN stored_hash = public.hash_email(input_email);
END;
$$;

-- Step 8: Add email_hash column for future secure storage (existing emails remain for backward compatibility)
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS email_hash text;

-- Step 9: Create index on email_hash for performance
CREATE INDEX IF NOT EXISTS idx_stock_alerts_email_hash ON public.stock_alerts(email_hash);

-- Step 10: Add trigger function to automatically hash new emails
CREATE OR REPLACE FUNCTION public.stock_alert_email_hash_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Always hash the email when inserting or updating
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.email != OLD.email) THEN
    NEW.email_hash := public.hash_email(NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 11: Create trigger to automatically hash emails
CREATE TRIGGER stock_alert_hash_email
  BEFORE INSERT OR UPDATE ON public.stock_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.stock_alert_email_hash_trigger();

-- Step 12: Add data access logging function for admin queries
CREATE OR REPLACE FUNCTION public.log_admin_data_access(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_accessed_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only log if user is authenticated and is admin
  IF auth.uid() IS NOT NULL AND is_admin(auth.uid()) THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      table_name,
      record_id,
      accessed_data,
      ip_address,
      created_at
    ) VALUES (
      auth.uid(),
      p_action,
      p_table_name,
      p_record_id,
      p_accessed_data,
      inet_client_addr(),
      now()
    );
  END IF;
END;
$$;