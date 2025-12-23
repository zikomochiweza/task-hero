-- Migration to add last_league_reset to profiles table
-- Run this in the Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN last_league_reset timestamptz DEFAULT now();

-- Comment: This column will track the last time the weekly league reset was processed for a user.
-- We default to now() so that existing users don't immediately trigger a reset upon deployment.
