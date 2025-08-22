-- Security hardening migration: RLS and function search_path fixes

-- 1) Stock alerts: prevent harvesting emails by disallowing reads of guest alerts
DO $$ BEGIN
  -- Drop insecure/select-anyone policy
  DROP POLICY IF EXISTS "Users can view their own stock alerts" ON public.stock_alerts;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Recreate safe read policy: only the owner may read stock alerts
CREATE POLICY IF NOT EXISTS "Users can view their own stock alerts (owner only)"
ON public.stock_alerts
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Keep insert policy as-is to allow guests to create alerts by email
-- (Guests' alerts remain unreadable by end-users; only service code can access)

-- 2) Cart items: lock down anonymous access to session-bound rows only
-- Helper to access request headers safely
CREATE OR REPLACE FUNCTION public.request_header(header_name text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT (current_setting('request.headers', true)::json ->> lower($1));
$$;

-- Drop existing broad policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
  DROP POLICY IF EXISTS "Users can create cart items" ON public.cart_items;
  DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
  DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: Only owner (authenticated) OR matching x-session-id (anonymous)
CREATE POLICY "Cart: select own or by session header"
ON public.cart_items
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL AND session_id = public.request_header('x-session-id'))
);

-- INSERT: Ensure new rows are attributed to the correct owner/session
CREATE POLICY "Cart: insert own or by session header"
ON public.cart_items
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL AND session_id = public.request_header('x-session-id') AND user_id IS NULL)
);

-- UPDATE: Only owner/session can modify
CREATE POLICY "Cart: update own or by session header"
ON public.cart_items
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL AND session_id = public.request_header('x-session-id'))
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL AND session_id = public.request_header('x-session-id'))
);

-- DELETE: Only owner/session can delete
CREATE POLICY "Cart: delete own or by session header"
ON public.cart_items
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
  (auth.uid() IS NULL AND session_id IS NOT NULL AND session_id = public.request_header('x-session-id'))
);

-- 3) Fix mutable search_path for update_conversation_on_message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;