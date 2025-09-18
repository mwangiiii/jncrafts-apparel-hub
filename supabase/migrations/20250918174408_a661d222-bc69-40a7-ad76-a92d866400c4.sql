-- Fix remaining functions that may be missing search_path

-- Fix generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  order_num TEXT;
BEGIN
  order_num := 'JNC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT::TEXT, 10, '0');
  RETURN order_num;
END;
$$;

-- Fix update_product_images_updated_at function
CREATE OR REPLACE FUNCTION public.update_product_images_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix validate_guest_session function
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

-- Fix validate_guest_session_secure function
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

-- Fix cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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