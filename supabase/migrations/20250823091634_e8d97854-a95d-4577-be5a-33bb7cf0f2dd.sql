-- Fix function search_path security warnings
-- Update functions to have immutable search_path for security

-- Fix validate_guest_session function
CREATE OR REPLACE FUNCTION public.validate_guest_session(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
  -- Check if session exists and hasn't expired
  RETURN EXISTS (
    SELECT 1 
    FROM public.guest_sessions 
    WHERE session_id = p_session_id 
    AND expires_at > now()
  );
END;
$$;

-- Fix cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete expired sessions and associated cart items
  DELETE FROM public.cart_items 
  WHERE session_id IN (
    SELECT session_id 
    FROM public.guest_sessions 
    WHERE expires_at < now()
  );
  
  DELETE FROM public.guest_sessions 
  WHERE expires_at < now();
END;
$$;