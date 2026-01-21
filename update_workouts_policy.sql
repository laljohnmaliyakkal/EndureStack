-- Enable RLS on workouts table
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (public catalog)
-- Using 'true' for simplicity, or could restrict to authenticated
CREATE POLICY "Enable read access for all users" ON workouts
    FOR SELECT
    USING (true);

-- Allow authenticated users (trainers/users) to add new exercises
CREATE POLICY "Enable insert for authenticated users" ON workouts
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Optional: Allow users to update/delete only if they created it?
-- For now, catalog is shared, arguably only admins should delete, 
-- but we might want to allow creators to edit.
-- Keeping it simple: Invite only insert.
