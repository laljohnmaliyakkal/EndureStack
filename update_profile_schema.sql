-- Add professional details columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS certifications TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS achievements TEXT;
