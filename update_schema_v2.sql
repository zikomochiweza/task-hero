-- Add avatar_url to profiles if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table profiles add column avatar_url text;
  end if;
end $$;

-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', true)
on conflict (id) do nothing;

-- Policy for avatars: Public read, Authenticated upload/update
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

-- Policy for task proofs: Public read (for now), Authenticated upload
create policy "Task proofs are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'task-proofs' );

create policy "Anyone can upload a task proof."
  on storage.objects for insert
  with check ( bucket_id = 'task-proofs' and auth.role() = 'authenticated' );
