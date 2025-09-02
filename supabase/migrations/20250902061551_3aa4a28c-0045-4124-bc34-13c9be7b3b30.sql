-- Fix remaining security issues by updating all functions to have proper search_path

-- Update all functions that don't have search_path set
-- These functions need the search_path parameter for security

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_stock_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If stock quantity changed from 0 to positive, trigger alerts
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    -- Mark alerts as needing notification (will be handled by edge function)
    UPDATE public.stock_alerts 
    SET notified = FALSE 
    WHERE product_id = NEW.id AND notified = TRUE;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.hash_email(email_address text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Use pgcrypto extension for secure hashing
  -- This allows for email verification while protecting the actual email
  RETURN encode(digest(lower(trim(email_address)), 'sha256'), 'hex');
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_email_match(stored_hash text, input_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN stored_hash = public.hash_email(input_email);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stock_alert_email_hash_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Always hash the email when inserting or updating
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.email != OLD.email) THEN
    NEW.email_hash := public.hash_email(NEW.email);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_data_access(p_action text, p_table_name text, p_record_id uuid DEFAULT NULL::uuid, p_accessed_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_profile_access(p_action text, p_profile_id uuid, p_accessed_fields text[] DEFAULT ARRAY['basic_info'::text])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log admin access to other users' profiles
  IF auth.uid() IS NOT NULL AND is_admin(auth.uid()) THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      table_name,
      record_id,
      accessed_data,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      auth.uid(),
      p_action,
      'profiles',
      p_profile_id,
      jsonb_build_object(
        'accessed_fields', p_accessed_fields,
        'timestamp', now(),
        'access_type', 'profile_data'
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent',
      now()
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Check if this is a seeded admin user
  IF NEW.email IN ('mwangiwanjiku033@gmail.com', 'admin@jncrafts.com', 'justintheurimbugua@gmail.com') THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;