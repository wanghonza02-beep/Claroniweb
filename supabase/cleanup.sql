-- ============================================================================
-- Claroni — úklid databáze
-- ----------------------------------------------------------------------------
-- Spusť v Supabase → SQL Editor. Čti to shora dolů a pouštěj po blocích,
-- ne najednou — krok 3 maže data a vrátit to nejde.
--
-- Co web ve skutečnosti používá (ověřeno v kódu):
--   newsletter_subscribers   ANO  — jediná tabulka, na kterou se kód dotazuje
--   profiles                 ne   — dashboard bere e-mail rovnou z auth session
--   users                    ne   — kód se na ni neodkazuje vůbec
--
-- auth.users je Supabase interní tabulka s účty. Té se nedotýkej, přihlašování
-- na ní stojí. Řeč je o public.users, což je něco jiného.
-- ============================================================================


-- ============================================================================
-- 1. NEJDŘÍV ZASTAVIT ÚNIK  — nic nemaže, dělej to jako první
-- ----------------------------------------------------------------------------
-- public.users vrací jméno, e-mail a věk komukoliv na internetu. Publishable
-- klíč je veřejný a je v repu, takže stačí jeden curl. Tohle to okamžitě
-- zavře, aniž bys cokoliv smazal.
-- ============================================================================

-- podívej se, která politika to pouští:
select policyname, cmd, roles, qual as using_expression, with_check
from pg_policies
where schemaname = 'public' and tablename = 'users';

-- pak zahoď všechny její politiky. RLS zapnutá bez politiky = zakázáno vše,
-- což je bezpečný výchozí stav.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'users'
  loop
    execute format('drop policy %I on public.users', p.policyname);
  end loop;
end $$;

alter table public.users enable row level security;

-- ověř: tohle už nesmí vrátit žádný řádek přes anon klíč
select count(*) as policies_left from pg_policies
where schemaname = 'public' and tablename = 'users';


-- ============================================================================
-- 2. NEWSLETTER — tohle je důvod, proč formulář nezapisuje
-- ----------------------------------------------------------------------------
-- Tabulka nemá INSERT politiku, takže RLS zápis odmítá chybou 42501.
-- ============================================================================

alter table public.newsletter_subscribers enable row level security;

create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

drop policy if exists newsletter_insert_anon on public.newsletter_subscribers;
create policy newsletter_insert_anon
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (email is not null and email <> '');

-- Schválně žádná SELECT politika: kdyby tam byla, kdokoliv si stáhne celý
-- seznam odběratelů — přesně jako teď u public.users.
-- Čti seznam přes Supabase UI nebo service-role klíčem, nikdy z prohlížeče.

-- ověř: musí být přesně jeden řádek, cmd = INSERT
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'newsletter_subscribers';


-- ============================================================================
-- 3. MAZÁNÍ  — NEVRATNÉ. Pusť, až budeš mít jistotu.
-- ----------------------------------------------------------------------------
-- Nejdřív se podívej, co v tabulkách je. Krok 1 už únik zastavil, takže tenhle
-- krok nemusí být hned.
-- ============================================================================

-- podívej se, o co přijdeš:
select * from public.users;
select * from public.profiles;

-- když ti to nic neříká a nechceš to:
-- drop table public.users;

-- profiles jsem zakládal já a nic ji zatím nepoužívá. Má ale připravený
-- trigger, který profil založí při každé registraci — hodí se, až budeš
-- ukládat cokoliv o uživateli nad rámec přihlášení. Doporučuju nechat.
-- Když ji přesto chceš pryč, musí jít i trigger, jinak registrace spadne:
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop table public.profiles;

-- testovací řádek, který jsem zapsal při diagnostice (zápis stejně selhal,
-- takže tam nejspíš není — pro jistotu):
-- delete from public.newsletter_subscribers
--  where email = 'claude-test-DELETE-ME@example.com';
