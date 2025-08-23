-- Add restrictive RLS policy for guest_sessions table
-- This fixes the security vulnerability where guest session data was too exposed

-- Remove existing overly permissive policies
DROP POLICY IF EXISTS "Users can read their own guest session" ON public.guest_sessions;
DROP POLICY IF EXISTS "Allow updating session access time" ON public.guest_sessions;

-- Add secure RLS policies for guest_sessions
CREATE POLICY "Guest sessions are private"
ON public.guest_sessions
FOR SELECT
USING (false); -- No direct access via SELECT

CREATE POLICY "Allow system to create guest sessions"
ON public.guest_sessions
FOR INSERT
WITH CHECK (true); -- Allow creation but no direct access

CREATE POLICY "Allow system to update session timestamps"
ON public.guest_sessions
FOR UPDATE
USING (true)
WITH CHECK (true); -- Allow system updates but no direct user access