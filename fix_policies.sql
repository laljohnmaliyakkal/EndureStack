-- Create a function to check admin role securely (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can create trainers" ON profiles;

-- Re-create "Admins can view all profiles" using the secure function
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        is_admin()
    );

-- Re-create Insert policy
-- Users can insert their own profile as 'user'
-- Admins can insert any profile (e.g. creating trainers)
CREATE POLICY "Enable insert for users and admins" ON profiles
    FOR INSERT WITH CHECK (
        (auth.uid() = user_id AND role = 'user') 
        OR 
        is_admin()
    );
