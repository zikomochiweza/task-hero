-- 1. Add avatar_url to profiles table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table profiles add column avatar_url text;
  end if;
end $$;

-- 2. Create Storage Buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', true)
on conflict (id) do nothing;

-- 3. Storage Policies (Avatars)
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "Anyone can update their own avatar."
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner )
  with check ( bucket_id = 'avatars' and auth.uid() = owner );

-- 4. Storage Policies (Task Proofs)
create policy "Task proofs are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'task-proofs' );

create policy "Anyone can upload a task proof."
  on storage.objects for insert
  with check ( bucket_id = 'task-proofs' and auth.role() = 'authenticated' );

-- 5. Create Tasks Table (for Cross-Device Sync)
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  completed boolean default false,
  proof_url text,
  xp_value integer default 50,
  created_at timestamptz default now()
);

-- 6. Tasks Table RLS Policies
alter table tasks enable row level security;

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
