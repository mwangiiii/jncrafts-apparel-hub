-- Create admin user role for seeded admin account
-- Note: The admin user will need to sign up through the normal flow first
-- Then this migration will grant them admin privileges

-- Insert admin role for the user with email 'admin@jncrafts.com'
-- This will be automatically linked when the user signs up
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::user_role 
FROM auth.users 
WHERE email = 'admin@jncrafts.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Note: If no user exists with this email yet, this insert will have no effect
-- The admin will need to sign up first with email: admin@jncrafts.com and password: 567890