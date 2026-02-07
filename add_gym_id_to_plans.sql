-- Add gym_id to workout_plans
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Backfill gym_id for existing plans based on creator's profile
UPDATE workout_plans
SET gym_id = profiles.gym_id
FROM profiles
WHERE workout_plans.created_by = profiles.user_id 
AND workout_plans.gym_id IS NULL;

-- Remove old policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "View public plans from same gym" ON workout_plans;
DROP POLICY IF EXISTS "Create plans for own gym" ON workout_plans;
DROP POLICY IF EXISTS "Creating plans" ON workout_plans; -- Standard name check
DROP POLICY IF EXISTS "Public plans are viewable by everyone" ON workout_plans; 

-- Policy: View Public Plans (Same Gym OR Global)
CREATE POLICY "View public plans" ON workout_plans
FOR SELECT
USING (
    is_public = true AND (
        gym_id IS NULL OR
        gym_id IN (
            SELECT gym_id FROM profiles WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Trainers/Admins can create plans for their gym
CREATE POLICY "Create plans for own gym" ON workout_plans
FOR INSERT
WITH CHECK (
    auth.uid() = created_by AND (
        gym_id IS NULL OR -- Allow global if needed? Or restrict?
        gym_id IN (
            SELECT gym_id FROM profiles WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Update own plans
CREATE POLICY "Update own plans" ON workout_plans
FOR UPDATE
USING (auth.uid() = created_by);

-- Policy: Delete own plans
CREATE POLICY "Delete own plans" ON workout_plans
FOR DELETE
USING (auth.uid() = created_by);

