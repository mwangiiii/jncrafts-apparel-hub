-- Fix profiles table RLS policies to prevent security issues while maintaining functionality
-- The current policies are conflicting - there are "deny all" policies that block even legitimate access

-- First, drop the conflicting restrictive policies
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny public read access to profiles" ON public.profiles;

-- Create secure policies that allow proper access control
-- Users can only view their own profile data
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Admins can view all profiles (with audit logging)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  (SELECT log_admin_data_access('VIEW_PROFILE', 'profiles', id, row_to_json(profiles)::jsonb) FROM profiles WHERE profiles.id = profiles.id LIMIT 1) IS NOT NULL
);

-- Admins can manage all profiles  
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- The existing user policies for their own data remain and work correctly:
-- "Users can delete their own profile"
-- "Users can insert their own profile" 
-- "Users can update their own profile"