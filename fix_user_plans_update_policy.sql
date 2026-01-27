-- Allow users to update their own plan assignments (specifically for stopping them by setting is_active = false)
CREATE POLICY "Users can update own plan assignments" ON user_plans
    FOR UPDATE USING (user_id = auth.uid());
