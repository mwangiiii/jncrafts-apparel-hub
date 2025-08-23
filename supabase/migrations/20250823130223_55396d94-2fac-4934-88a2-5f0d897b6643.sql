-- Part 2: Strengthen RLS policies and improve session security

-- 5. Strengthen RLS policies for stock_alerts - remove any potential gaps
DROP POLICY IF EXISTS "Users can view only their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Authenticated users can create their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Users can update their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Users can delete their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Authenticated admins can view stock alerts" ON public.stock_alerts;

-- Create more restrictive RLS policies that only allow authenticated users
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

-- 6. Explicitly deny all public access to stock alerts
CREATE POLICY "Deny all public access to stock alerts" 
ON public.stock_alerts 
FOR ALL 
TO anon
USING (false);

-- 7. Improve cart session security - add better session validation
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
  
  -- Check if session exists and hasn't expired, with additional staleness check
  RETURN EXISTS (
    SELECT 1 
    FROM public.guest_sessions 
    WHERE session_id = p_session_id 
      AND expires_at > now()
      AND last_accessed > (now() - interval '7 days')
  );
END;
$$;

-- Update the existing validate_guest_session function to use the secure version
CREATE OR REPLACE FUNCTION public.validate_guest_session(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.validate_guest_session_secure(p_session_id);
END;
$$;