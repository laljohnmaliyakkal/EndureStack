-- Add muscle_group column to workout_plan_items table
ALTER TABLE workout_plan_items
ADD COLUMN muscle_group TEXT;

-- Optional: Update existing items based on workout name if possible, 
-- but for now just defaulting to NULL is fine.
