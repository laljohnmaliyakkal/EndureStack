-- Allow trainers to update user_plans for their assigned users
-- This policy allows update if the auth user is a trainer for the user_id in user_plans

CREATE POLICY "Trainers can update their clients' plans"
ON user_plans
FOR UPDATE
USING (
  exists (
    select 1 from trainer_users
    where trainer_users.trainer_id = auth.uid()
    and trainer_users.user_id = user_plans.user_id
  )
)
WITH CHECK (
  exists (
    select 1 from trainer_users
    where trainer_users.trainer_id = auth.uid()
    and trainer_users.user_id = user_plans.user_id
  )
);
