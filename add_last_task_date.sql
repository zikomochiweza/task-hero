-- Add last_task_date column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_task_date TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing users: assume last_login was their last task date to preserve streaks temporarily
UPDATE profiles 
SET last_task_date = last_login 
WHERE last_task_date IS NULL;
