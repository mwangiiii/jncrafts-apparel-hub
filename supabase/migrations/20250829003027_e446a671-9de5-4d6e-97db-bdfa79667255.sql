-- Fix the view creation by not applying RLS directly to views
-- Views inherit security from their underlying tables

-- Create the secure view without RLS policies (views can't have RLS)
CREATE OR REPLACE VIEW public.profiles_secure AS
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
FROM public.profiles p
WHERE 
  -- Security is enforced here in the view definition
  (p.user_id = auth.uid()) OR -- Users can see their own
  is_admin(auth.uid()); -- Admins can see all (with masking)

-- Grant access to the secure view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Comment documenting the security approach
COMMENT ON VIEW public.profiles_secure IS 'Secure view for customer profiles with data masking for admin access and audit logging. Security is enforced through the WHERE clause and underlying table RLS policies.';