-- Prep & Progress — per-user cloud backup (Supabase Postgres).
-- Run this in the Supabase SQL Editor while signed in as the project owner.
-- Does not store the USDA food database — only the signed-in user's app state.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.user_state is
  'Per-user Prep & Progress backup (profile, journal, weights, recipes, plan, awards). Not the shared USDA food database.';

create index if not exists user_state_updated_at_idx on public.user_state (updated_at desc);

alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own"
  on public.user_state
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own"
  on public.user_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own"
  on public.user_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own"
  on public.user_state
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Server clock for last-write-wins after the first-login choice.
create or replace function public.user_state_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before insert or update on public.user_state
  for each row
  execute function public.user_state_touch();

-- Lets a signed-in user erase their cloud row and auth account.
-- Created in the SQL Editor (as postgres) so it can delete from auth.users.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.user_state where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
