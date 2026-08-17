-- ============================================================================
-- Claroni — Row Level Security
-- ----------------------------------------------------------------------------
-- Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
--
-- WHY THIS MATTERS
-- The key shipped in assets/src/supabase-client.js is the *publishable* key.
-- It is public by design and belongs in client code. The only thing standing
-- between your tables and anyone on the internet is RLS. A table without RLS
-- is readable and writable by every visitor to the site.
-- ============================================================================


-- ============================================================================
-- 1. AUDIT — run this first, and any time you add a table
-- ----------------------------------------------------------------------------
-- Every row must show rls_enabled = true AND policy_count > 0.
-- RLS on with zero policies denies everything, which is safe but breaks reads.
-- ============================================================================

select
  c.relname                as table_name,
  c.relrowsecurity         as rls_enabled,
  count(p.polname)         as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity asc, c.relname;


-- ============================================================================
-- 2. PROFILES — one row per authenticated user
-- ----------------------------------------------------------------------------
-- The dashboard currently reads the email straight off the auth session, so
-- this is not required yet. It is the table you will want the moment you store
-- anything about a user beyond their login.
-- ============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each policy is scoped to the row the caller owns. auth.uid() is the id of
-- the user making the request, taken from their JWT — it cannot be forged
-- from the browser.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert
  with check (auth.uid() = id);

-- Deliberately no DELETE policy: rows disappear with the auth user via the
-- cascade above, and nothing should be able to delete a profile from the client.


-- ============================================================================
-- 3. AUTO-CREATE A PROFILE ON SIGN-UP
-- ----------------------------------------------------------------------------
-- security definer lets the trigger write to public.profiles even though the
-- new user has no rights yet. search_path is pinned, which is the documented
-- way to keep a definer function from being hijacked by a shadowed schema.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 4. TEMPLATE — copy this for every future table holding per-user rows
-- ----------------------------------------------------------------------------
-- e.g. connected cards, transactions, insights. Replace <table>.
-- ============================================================================

-- create table if not exists public.<table> (
--   id          uuid primary key default gen_random_uuid(),
--   user_id     uuid not null references auth.users (id) on delete cascade,
--   created_at  timestamptz not null default now()
--   -- your columns here
-- );
--
-- alter table public.<table> enable row level security;
--
-- create policy <table>_select_own on public.<table>
--   for select using (auth.uid() = user_id);
--
-- create policy <table>_insert_own on public.<table>
--   for insert with check (auth.uid() = user_id);
--
-- create policy <table>_update_own on public.<table>
--   for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
--
-- create policy <table>_delete_own on public.<table>
--   for delete using (auth.uid() = user_id);
--
-- create index if not exists <table>_user_id_idx on public.<table> (user_id);


-- ============================================================================
-- 5. RE-RUN THE AUDIT
-- ----------------------------------------------------------------------------
-- Scroll back up and run query 1 again. Anything with rls_enabled = false is
-- wide open.
-- ============================================================================
