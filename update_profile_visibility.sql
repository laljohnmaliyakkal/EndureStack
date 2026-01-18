-- Allow all authenticated users to view trainer profiles
CREATE POLICY "Authenticated users can view trainer profiles" ON profiles
    FOR SELECT
    USING (role = 'trainer' AND auth.role() = 'authenticated');
