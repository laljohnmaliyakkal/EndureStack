-- Enable RLS on trainer_users
ALTER TABLE trainer_users ENABLE ROW LEVEL SECURITY;

-- Admin Policy: Full Access
CREATE POLICY "Admins can manage trainer_users" ON trainer_users
    USING (is_admin())
    WITH CHECK (is_admin());

-- Trainer Policy: View own assignments
CREATE POLICY "Trainers can view own assignments" ON trainer_users
    FOR SELECT
    USING (auth.uid() = trainer_id);

-- User Policy: View own assignment? (Maybe not needed yet, but good for transparency)
CREATE POLICY "Users can view own trainer" ON trainer_users
    FOR SELECT
    USING (auth.uid() = user_id);
