-- Seed Default Plans

-- 1. Push Pull Legs (PPL) - 6 Days
DO $$
DECLARE
    ppl_id UUID;
    day_id UUID;
BEGIN
    -- Create Plan
    INSERT INTO workout_plans (name, description, is_public)
    VALUES ('Push Pull Legs', 'A classic 6-day split focusing on pushing, pulling, and leg movements.', true)
    RETURNING id INTO ppl_id;

    -- Day 1: Push
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ppl_id, 1, 'Push A') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Bench Press', 3, 10, 1),
    (day_id, 'Overhead Press', 3, 12, 2),
    (day_id, 'Tricep Extension', 3, 15, 3);

    -- Day 2: Pull
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ppl_id, 2, 'Pull A') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Deadlift', 3, 5, 1),
    (day_id, 'Pull Up', 3, 8, 2),
    (day_id, 'Bicep Curl', 3, 12, 3);

    -- Day 3: Legs
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ppl_id, 3, 'Legs A') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Squat', 3, 8, 1),
    (day_id, 'Leg Press', 3, 12, 2),
    (day_id, 'Lunge', 3, 12, 3);

    -- Day 4: Push
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ppl_id, 4, 'Push B') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Bench Press', 3, 10, 1),
    (day_id, 'Lateral Raise', 3, 15, 2),
    (day_id, 'Push Up', 3, 20, 3);

    -- Day 5: Pull
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ppl_id, 5, 'Pull B') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Lat Pulldown', 3, 12, 1),
    (day_id, 'Dumbbell Fly', 3, 12, 2), -- Not strictly pull but adding for variety in this example
    (day_id, 'Bicep Curl', 3, 12, 3);

    -- Day 6: Legs
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ppl_id, 6, 'Legs B') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Squat', 3, 8, 1),
    (day_id, 'Leg Press', 3, 12, 2),
    (day_id, 'Plank', 3, 60, 3); -- Core finish

END $$;

-- 2. Upper Lower - 6 Days (Repeat Upper/Lower 3 times)
DO $$
DECLARE
    ul_id UUID;
    day_id UUID;
BEGIN
    -- Create Plan
    INSERT INTO workout_plans (name, description, is_public)
    VALUES ('Upper Lower Body', 'A 6-day split alternating between upper and lower body workouts.', true)
    RETURNING id INTO ul_id;

    -- Day 1: Upper
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ul_id, 1, 'Upper A') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Bench Press', 3, 10, 1),
    (day_id, 'Pull Up', 3, 8, 2),
    (day_id, 'Overhead Press', 3, 12, 3);

    -- Day 2: Lower
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ul_id, 2, 'Lower A') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Squat', 3, 8, 1),
    (day_id, 'Deadlift', 3, 5, 2),
    (day_id, 'Crunch', 3, 20, 3);

    -- Day 3: Upper
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ul_id, 3, 'Upper B') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Push Up', 3, 20, 1),
    (day_id, 'Lat Pulldown', 3, 12, 2),
    (day_id, 'Lateral Raise', 3, 15, 3);

    -- Day 4: Lower
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ul_id, 4, 'Lower B') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Leg Press', 3, 12, 1),
    (day_id, 'Lunge', 3, 12, 2),
    (day_id, 'Plank', 3, 60, 3);

    -- Day 5: Upper
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ul_id, 5, 'Upper C') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Bench Press', 3, 10, 1),
    (day_id, 'Bicep Curl', 3, 12, 2),
    (day_id, 'Tricep Extension', 3, 15, 3);

    -- Day 6: Lower
    INSERT INTO workout_plan_days (plan_id, day_number, day_name) VALUES (ul_id, 6, 'Lower C') RETURNING id INTO day_id;
    INSERT INTO workout_plan_items (plan_day_id, workout_name, sets, reps, order_index) VALUES
    (day_id, 'Squat', 3, 8, 1),
    (day_id, 'Deadlift', 3, 5, 2),
    (day_id, 'Crunch', 3, 20, 3);

END $$;
