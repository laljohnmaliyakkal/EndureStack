-- Create Workout Plans Table
CREATE TABLE workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for system defaults
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on workout_plans
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Create Workout Plan Days Table (e.g., Day 1: Push, Day 2: Pull)
CREATE TABLE workout_plan_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_number INT NOT NULL, -- 1 to 6
    day_name TEXT, -- e.g., 'Leg Day', 'Upper Body'
    UNIQUE(plan_id, day_number)
);

-- Enable RLS on workout_plan_days
ALTER TABLE workout_plan_days ENABLE ROW LEVEL SECURITY;

-- Create Workout Plan Items Table (The actual exercises for a day)
CREATE TABLE workout_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_day_id UUID REFERENCES workout_plan_days(id) ON DELETE CASCADE,
    workout_name TEXT NOT NULL, -- Intentionally loose reference or could link to workouts table
    sets INT NOT NULL DEFAULT 3,
    reps INT NOT NULL DEFAULT 10,
    order_index INT NOT NULL DEFAULT 0
);

-- Enable RLS on workout_plan_items
ALTER TABLE workout_plan_items ENABLE ROW LEVEL SECURITY;

-- Create User Plans Table (Assignments)
CREATE TABLE user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES workout_plans(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Could be self-assigned or by trainer
    start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_plans
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- workout_plans:
-- Everyone can read public plans (system defaults)
CREATE POLICY "Public plans are viewable by everyone" ON workout_plans
    FOR SELECT USING (is_public = true);

-- Trainers can read/create/update/delete their own plans
CREATE POLICY "Trainers can manage their own plans" ON workout_plans
    FOR ALL USING (auth.uid() = created_by);

-- Users can read plans assigned to them (via user_plans) - slightly complex due to join, simplified for now:
-- Allow authenticated users to read any plan for simplicity in this MVP, or stick to public + owned + assigned.
-- Let's stick to: Public OR Created by Me OR Assigned to Me.
CREATE POLICY "Users can view assigned plans" ON workout_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_plans 
            WHERE user_plans.plan_id = workout_plans.id 
            AND user_plans.user_id = auth.uid()
        )
    );

-- workout_plan_days & items:
-- Viewable if the parent plan is viewable.
-- For simplicity, we can just enable read for authenticated users or replicate the plan logic.
-- Let's enable read for all authenticated users for now to reduce complexity, as plans aren't highly sensitive.
CREATE POLICY "Authenticated users can view plan details" ON workout_plan_days
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view plan items" ON workout_plan_items
    FOR SELECT TO authenticated USING (true);
    
-- Trainers can manage details of their own plans
CREATE POLICY "Trainers can manage their own plan days" ON workout_plan_days
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workout_plans
            WHERE workout_plans.id = workout_plan_days.plan_id
            AND workout_plans.created_by = auth.uid()
        )
    );

CREATE POLICY "Trainers can manage their own plan items" ON workout_plan_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workout_plan_days
            JOIN workout_plans ON workout_plans.id = workout_plan_days.plan_id
            WHERE workout_plan_days.id = workout_plan_items.plan_day_id
            AND workout_plans.created_by = auth.uid()
        )
    );


-- user_plans:
-- Users can view their own assignments
CREATE POLICY "Users can view own plan assignments" ON user_plans
    FOR SELECT USING (user_id = auth.uid());

-- Trainers can view assignments they made
CREATE POLICY "Trainers can view assignments they created" ON user_plans
    FOR SELECT USING (assigned_by = auth.uid());

-- Trainers can create assignments
CREATE POLICY "Trainers can assign plans" ON user_plans
    FOR INSERT WITH CHECK (assigned_by = auth.uid());

-- Users can assign themselves public plans (optional feature)
CREATE POLICY "Users can assign public plans to themselves" ON user_plans
    FOR INSERT WITH CHECK (user_id = auth.uid());
