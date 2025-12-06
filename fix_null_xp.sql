-- Fix NULL XP values
UPDATE profiles SET xp = 0 WHERE xp IS NULL;
UPDATE profiles SET completed_tasks = 0 WHERE completed_tasks IS NULL;

