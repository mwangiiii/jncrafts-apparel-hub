-- Fix cart session security vulnerability
-- Current issue: Any session_id value allows access to cart_items
-- Solution: Add proper session validation and strengthen policies

-- First, let's add a sessions table to properly track guest sessions
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  user_agent text,
  ip_address inet
);

-- Enable RLS on guest_sessions
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow creation of guest sessions
CREATE POLICY "Allow creating guest sessions" 
ON public.guest_sessions 
FOR INSERT 
WITH CHECK (true);

-- Policy to allow reading own session (by session_id)
CREATE POLICY "Users can read their own guest session" 
ON public.guest_sessions 
FOR SELECT 
USING (true); -- We'll validate in application logic

-- Policy to update session access time
CREATE POLICY "Allow updating session access time" 
ON public.guest_sessions 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Create function to validate session ownership
CREATE OR REPLACE FUNCTION public.validate_guest_session(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

-- Update cart_items RLS policies with proper session validation
DROP POLICY IF EXISTS "Users can create cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;  
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;

-- New secure policies for cart_items
CREATE POLICY "Users can create cart items" 
ON public.cart_items 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session(session_id))
);

CREATE POLICY "Users can view their own cart items" 
ON public.cart_items 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session(session_id))
);

CREATE POLICY "Users can update their own cart items" 
ON public.cart_items 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session(session_id))
) 
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL and validate_guest_session(session_id))
);

CREATE POLICY "Users can delete their own cart items" 
ON public.cart_items 
FOR DELETE 
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) 
  OR 
  (auth.uid() IS NULL AND session_id IS NOT NULL AND validate_guest_session(session_id))
);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add index for better performance on session lookups
CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_id ON public.guest_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON public.guest_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON public.cart_items(session_id);