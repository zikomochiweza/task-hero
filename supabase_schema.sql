-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  xp integer default 0,
  league text default 'Bronze',
  streak integer default 0,
  last_login timestamptz default now(),
  completed_tasks integer default 0
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Allow anyone to read profiles (so we can see the leaderboard)
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- Allow users to insert their own profile
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a trigger to automatically create a profile on signup
-- (Optional but recommended for smoother UX, but for now we can handle it in the app)
