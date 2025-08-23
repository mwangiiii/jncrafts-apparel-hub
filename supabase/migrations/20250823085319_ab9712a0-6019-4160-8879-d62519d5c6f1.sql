-- Add explicit security policy to deny public access to profiles table
-- This prevents any potential unauthorized access to sensitive customer data

-- Create an explicit policy to deny public (unauthenticated) access to profiles
CREATE POLICY "Deny public access to profiles" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false);

-- Create an explicit policy to deny public read access specifically  
CREATE POLICY "Deny public read access to profiles"
ON public.profiles
FOR SELECT 
TO anon
USING (false);

-- Add a comment to document the security enhancement
COMMENT ON TABLE public.profiles IS 'Contains sensitive customer data - protected by RLS with explicit public access denial';