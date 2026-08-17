-- ============================================================================
-- Claroni — subscriptions table for Stripe
-- ----------------------------------------------------------------------------
-- Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
--
-- Run this BEFORE deploying the edge functions: both of them read and write
-- this table, and create-checkout-session queries it on the very first click.
-- ============================================================================


-- ============================================================================
-- 1. THE TABLE
-- ----------------------------------------------------------------------------
-- One row per user. The unique constraint on user_id is what makes the
-- webhook's upsert work — without it a renewal would append a second row and
-- the app would have two disagreeing answers about who is paying.
-- ============================================================================

create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  -- Stripe's own vocabulary, stored verbatim: trialing, active, past_due,
  -- canceled, incomplete, incomplete_expired, unpaid, paused.
  status                  text,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);


-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Read-only from the browser, and only your own row.
--
-- There is deliberately NO insert, update or delete policy. Every write comes
-- from the webhook using the service role key, which bypasses RLS. If the
-- browser could write here, a visitor would simply set status = 'active' and
-- take the paid plan for free.
-- ============================================================================

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- 3. CONVENIENCE VIEW OF "IS THIS PERSON PAYING?"
-- ----------------------------------------------------------------------------
-- trialing counts as paying; past_due does too, for the grace period Stripe
-- allows before it gives up and marks the subscription canceled.
-- ============================================================================

create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('trialing', 'active', 'past_due')
  );
$$;


-- ============================================================================
-- 4. VERIFY
-- ----------------------------------------------------------------------------
-- Expect exactly one row: subscriptions_select_own / SELECT / {authenticated}
-- with the expression (auth.uid() = user_id).
--
-- Anything listing INSERT, UPDATE or DELETE means the browser can grant itself
-- a subscription. Drop it.
-- ============================================================================

select policyname, cmd, roles, qual as using_expression, with_check
from pg_policies
where schemaname = 'public' and tablename = 'subscriptions';
