-- Add cohort_id to profiles
alter table profiles add column cohort_id text;

-- Add achievement counters if they don't exist (some might be missing from initial schema)
alter table profiles add column night_owl_count integer default 0;
alter table profiles add column streak_7_count integer default 0;
alter table profiles add column finals_won integer default 0;
alter table profiles add column top_3_finishes integer default 0;

-- Function to find an open cohort
create or replace function get_open_cohort(user_league text)
returns text
language plpgsql
as $$
declare
  cohort_rec record;
begin
  -- Look for existing cohorts in this league with < 25 members
  for cohort_rec in
    select cohort_id, count(*) as count
    from profiles
    where league = user_league and cohort_id is not null
    group by cohort_id
  loop
    if cohort_rec.count < 25 then
      return cohort_rec.cohort_id;
    end if;
  end loop;

  -- If no open cohort found, generate a new one (using current timestamp as ID)
  return 'cohort_' || floor(extract(epoch from now()));
end;
$$;
