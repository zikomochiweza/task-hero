-- Create tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  completed boolean default false,
  proof_url text,
  xp_value integer default 50,
  created_at timestamptz default now()
);

-- Enable RLS
alter table tasks enable row level security;

-- Policies
create policy "Users can view their own tasks"
  on tasks for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own tasks"
  on tasks for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own tasks"
  on tasks for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own tasks"
  on tasks for delete
  using ( auth.uid() = user_id );
