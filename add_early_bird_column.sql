-- Run this in your Supabase SQL Editor to add the Early Bird tracking column
-- It is safe to run on an existing database.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS early_bird_count integer DEFAULT 0;
