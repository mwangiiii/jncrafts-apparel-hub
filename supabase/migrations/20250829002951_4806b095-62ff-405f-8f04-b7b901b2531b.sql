-- Fix security definer view issue by removing the security_barrier setting
-- and implementing proper access controls

-- Remove the problematic security barrier setting
ALTER VIEW public.profiles_secure SET (security_barrier = false);

-- Drop and recreate the view without security definer properties
DROP VIEW IF EXISTS public.profiles_secure;

-- Create a regular view with proper access controls through RLS policies
CREATE VIEW public.profiles_secure AS
SELECT 
  p.id,
  p.user_id,
  p.created_at,
  p.updated_at,
  -- Full name: show based on access level
  CASE 
    WHEN p.user_id = auth.uid() THEN p.full_name -- User sees own full name
    WHEN is_admin(auth.uid()) THEN p.full_name -- Admin sees full name (but access is logged)
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

-- Add RLS policy to the secure view
CREATE POLICY "Secure profile view access" 
ON public.profiles_secure 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR -- Users can see their own
  is_admin(auth.uid()) -- Admins can see (with data masking applied in view)
);

-- Grant proper permissions
GRANT SELECT ON public.profiles_secure TO authenticated;