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
-- 3b. NEWSLETTER — write-only from the browser
-- ----------------------------------------------------------------------------
-- The footer form inserts anonymously, so anon needs INSERT. It must NOT get
-- SELECT: with the publishable key being public, a readable table means anyone
-- can download the whole subscriber list.
--
-- Run the verification at the bottom of this block after applying it.
-- ============================================================================

alter table public.newsletter_subscribers enable row level security;

-- one address once
create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

-- INSERT only. No select/update/delete policy exists, so those are denied.
drop policy if exists newsletter_insert_anon on public.newsletter_subscribers;
create policy newsletter_insert_anon
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (email is not null and email <> '');

-- Confirm the shape: expect exactly one row, cmd = INSERT.
-- Anything listing SELECT means the list is publicly readable.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'newsletter_subscribers';


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
-- 5. RE-RUN THE AUDIT — AND READ THE POLICIES, NOT JUST THE FLAG
-- ----------------------------------------------------------------------------
-- Query 1 only proves a lock exists. It does not prove the lock is shut:
-- a policy of `using (true)` reports rls_enabled = true, policy_count = 1 and
-- still serves every row to the entire internet. This is not hypothetical —
-- public.users passed query 1 while returning a real name, email and age to an
-- unauthenticated request.
--
-- Run this and read every expression. Anything that is `true`, or that does not
-- compare against auth.uid(), is open.
-- ============================================================================

select
  tablename,
  policyname,
  cmd,
  roles,
  qual        as using_expression,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- ============================================================================
-- 6. FIX FOR AN OVER-PERMISSIVE TABLE
-- ----------------------------------------------------------------------------
-- Template. Replace <table> and <policy> with what query 5 reported.
-- ============================================================================

-- drop policy "<policy>" on public.<table>;
--
-- -- then add an owner-scoped one, assuming the table has a user_id column:
-- create policy <table>_select_own on public.<table>
--   for select using (auth.uid() = user_id);
--
-- -- if the table holds no per-user data and nothing should read it from the
-- -- browser at all, add no select policy: RLS on with no policy denies all.

