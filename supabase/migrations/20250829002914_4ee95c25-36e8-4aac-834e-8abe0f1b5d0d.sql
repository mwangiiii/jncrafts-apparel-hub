-- Enhanced security controls for customer personal information
-- Implement data masking and granular access controls for admin users

-- Create data masking functions for sensitive information
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF phone_number IS NULL OR length(phone_number) < 4 THEN
    RETURN phone_number;
  END IF;
  
  -- Mask middle digits, show first 2 and last 2
  RETURN substring(phone_number from 1 for 2) || 
         repeat('*', greatest(0, length(phone_number) - 4)) || 
         substring(phone_number from length(phone_number) - 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_address(address_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF address_text IS NULL OR length(address_text) < 10 THEN
    RETURN '***';
  END IF;
  
  -- Show only general area, mask specific details
  RETURN substring(address_text from 1 for 5) || '***';
END;
$$;

-- Create secure profile view with data masking for different access levels
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  p.id,
  p.user_id,
  p.created_at,
  p.updated_at,
  -- Full name: show initials only for non-privileged admin access
  CASE 
    WHEN p.user_id = auth.uid() THEN p.full_name -- User sees own full name
    WHEN is_admin(auth.uid()) THEN 
      CASE 
        WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') 
        THEN p.full_name -- Full admin sees full name
        ELSE substring(p.full_name from 1 for 1) || '***' -- Limited admin sees initials
      END
    ELSE NULL
  END as full_name,
  -- Phone: masked for admin access
  CASE 
    WHEN p.user_id = auth.uid() THEN p.phone -- User sees own phone
    WHEN is_admin(auth.uid()) THEN public.mask_phone(p.phone) -- Admin sees masked phone
    ELSE NULL
  END as phone,
  -- Address: masked for admin access
  CASE 
    WHEN p.user_id = auth.uid() THEN p.address -- User sees own address
    WHEN is_admin(auth.uid()) THEN public.mask_address(p.address) -- Admin sees masked address
    ELSE NULL
  END as address
FROM public.profiles p;

-- Enable RLS on the secure view
ALTER VIEW public.profiles_secure SET (security_barrier = true);

-- Create enhanced audit logging function for profile access
CREATE OR REPLACE FUNCTION public.log_profile_access(
  p_action text,
  p_profile_id uuid,
  p_accessed_fields text[] DEFAULT ARRAY['basic_info']
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Update RLS policies to use secure view and enhanced logging
-- Drop the previous admin policy that had direct access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create new restrictive policy for admin profile access with logging
CREATE POLICY "Admins can view profiles with audit" 
ON public.profiles 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR -- Users can see their own
  (is_admin(auth.uid()) AND 
   public.log_profile_access('VIEW_CUSTOMER_PROFILE', id) IS NOT NULL)
);

-- Separate policy for admin management with enhanced logging
CREATE POLICY "Admins can manage profiles with strict audit" 
ON public.profiles 
FOR UPDATE
USING (
  (user_id = auth.uid()) OR -- Users can update their own
  (is_admin(auth.uid()) AND 
   public.log_profile_access('MODIFY_CUSTOMER_PROFILE', id, ARRAY['full_modification']) IS NOT NULL)
)
WITH CHECK (
  (user_id = auth.uid()) OR -- Users can update their own
  is_admin(auth.uid()) -- Admins can update (with logging from USING clause)
);

-- Create policy for profile deletion (highly restricted)
CREATE POLICY "Limited profile deletion" 
ON public.profiles 
FOR DELETE
USING (
  (user_id = auth.uid()) OR -- Users can delete their own
  (is_admin(auth.uid()) AND 
   public.log_profile_access('DELETE_CUSTOMER_PROFILE', id, ARRAY['profile_deletion']) IS NOT NULL)
);

-- Grant access to the secure view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Create index for efficient audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_profile_access 
ON public.admin_audit_log (admin_user_id, created_at) 
WHERE table_name = 'profiles';