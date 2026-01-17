-- Allow all authenticated users to view gyms (for selection in profile)
DROP POLICY IF EXISTS "Admins can view own gyms" ON gyms;
create policy "Authenticated users can view all gyms"
on "public"."gyms"
as PERMISSIVE
for SELECT
to authenticated
using (
  true
);

-- Keep Admin-only write policies
-- (These should already exist or be re-created if I dropped them? 
-- The previous script dropped specific ones. I will be safe and ensure they are correct)

DROP POLICY IF EXISTS "Admins can insert own gyms" ON gyms;
CREATE POLICY "Admins can insert own gyms" ON gyms
FOR INSERT WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update own gyms" ON gyms;
CREATE POLICY "Admins can update own gyms" ON gyms
FOR UPDATE USING (admin_id = auth.uid());
