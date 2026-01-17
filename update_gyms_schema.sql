-- Add admin_id to gyms table
ALTER TABLE gyms 
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id);

-- Set default admin_id to the creator if not provided? 
-- We can set it via trigger or just rely on the insert query.

-- Enable RLS on gyms
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

-- Remove old policies if any
DROP POLICY IF EXISTS "Admins can view own gyms" ON gyms;
DROP POLICY IF EXISTS "Admins can insert own gyms" ON gyms;
DROP POLICY IF EXISTS "Admins can update own gyms" ON gyms;
DROP POLICY IF EXISTS "Public view gyms" ON gyms;

-- Policy: Admins can view only their own gyms
CREATE POLICY "Admins can view own gyms" ON gyms
FOR SELECT USING (admin_id = auth.uid());

-- Policy: Admins can insert gyms (assigning themselves as admin)
CREATE POLICY "Admins can insert own gyms" ON gyms
FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Policy: Admins can update their own gyms
CREATE POLICY "Admins can update own gyms" ON gyms
FOR UPDATE USING (admin_id = auth.uid());

-- Allow users to view gyms? (Needed for selection during profile update maybe?)
-- For now, let's keep it restricted as requested ("admin should only view his gyms")
-- But if users need to see gyms to join, we might need a separate policy.
-- The prompt says "In manage gyms page unde admin, the admin should only view his gyms".
-- This implies the restriction is for the management view.
-- However, likely users need to see gyms contextually.
-- I'll stick to the specific request for now.
