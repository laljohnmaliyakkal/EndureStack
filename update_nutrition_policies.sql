-- Allow Trainers to view their assigned clients' food logs
CREATE POLICY "Trainers can view client food logs" ON food_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trainer_users
            WHERE trainer_id = auth.uid()
            AND user_id = food_logs.user_id
        )
    );

-- Allow Admins to view all food logs
CREATE POLICY "Admins can view all food logs" ON food_logs
    FOR SELECT
    USING (is_admin());
