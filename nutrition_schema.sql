-- Create Food Logs Table
CREATE TABLE IF NOT EXISTS food_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    calories INT NOT NULL,
    protein INT,
    carbs INT,
    fats INT,
    meal_type TEXT CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
    image_url TEXT,
    log_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage own food logs" ON food_logs;

CREATE POLICY "Users can manage own food logs" ON food_logs
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
