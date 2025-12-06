-- 1. Fix existing NULLs
UPDATE profiles SET xp = 0 WHERE xp IS NULL;
UPDATE profiles SET completed_tasks = 0 WHERE completed_tasks IS NULL;
UPDATE profiles SET streak = 0 WHERE streak IS NULL;

-- 2. Ensure defaults are set for future
ALTER TABLE profiles ALTER COLUMN xp SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN completed_tasks SET DEFAULT 0;

