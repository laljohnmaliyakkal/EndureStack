-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create Gyms Table
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Profiles Table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'trainer', 'user')) NOT NULL DEFAULT 'user',
    gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
    age INT,
    height_cm INT,
    weight_kg INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
-- Public read access? Or only authenticated?
-- Users can read their own profile.
-- Helper function to check admin role (Avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin());

-- User can update own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users and admins" ON profiles
    FOR INSERT
    WITH CHECK (
        (auth.uid() = user_id AND role = 'user') OR is_admin()
    );

-- Create Trainer Users Table
CREATE TABLE trainer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (trainer_id, user_id)
);

-- Create Workouts Table (Catalog of exercises?)
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    muscle_group TEXT
);

-- Create Workout Sessions
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    gym_id UUID REFERENCES gyms(id),
    session_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE (user_id, session_date)
);

-- Create Workout Logs
CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    workout_name TEXT NOT NULL,
    set_number INT,
    reps INT,
    weight DECIMAL(5,2),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT now()
);

-- View
CREATE OR REPLACE VIEW daily_workout_stats AS
SELECT 
    ws.user_id,
    ws.session_date,
    COUNT(wl.id) AS total_sets,
    SUM(wl.reps) AS total_reps,
    SUM(wl.reps * wl.weight) AS total_volume
FROM workout_sessions ws
JOIN workout_logs wl ON ws.id = wl.session_id
GROUP BY ws.user_id, ws.session_date;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
