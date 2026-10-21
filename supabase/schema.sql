-- ===========================================================================
-- Ag Desk — database schema
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is guarded.
--
-- Design notes
--  * market_reads is public to read and writable only by the service role,
--    so the terminal works for signed-out visitors but strangers cannot
--    write to your feed.
--  * journal rows are private to their owner, enforced in the database
--    rather than in application code.
--  * agent_usage is the rate limiter. It is written only by the server.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Market reads. One row per zone, overwritten by the scheduled job.
--    zone is one of: anz, eas, ind, eur, ams, ag
-- ---------------------------------------------------------------------------
create table if not exists public.market_reads (
  zone        text primary key,
  phase       text,
  stamp       text,
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.market_reads enable row level security;

drop policy if exists "market reads are world readable" on public.market_reads;
create policy "market reads are world readable"
  on public.market_reads for select
  using (true);

-- No insert/update/delete policy exists, so only the service role can write.

-- ---------------------------------------------------------------------------
-- 2. Journal. One row per saved entry, private to its author.
-- ---------------------------------------------------------------------------
create table if not exists public.journal (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists journal_user_created_idx
  on public.journal (user_id, created_at desc);

alter table public.journal enable row level security;

drop policy if exists "read own journal" on public.journal;
create policy "read own journal"
  on public.journal for select
  using (auth.uid() = user_id);

drop policy if exists "insert own journal" on public.journal;
create policy "insert own journal"
  on public.journal for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own journal" on public.journal;
create policy "update own journal"
  on public.journal for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own journal" on public.journal;
create policy "delete own journal"
  on public.journal for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Agent usage. One row per account per UTC day. Server-written only.
-- ---------------------------------------------------------------------------
create table if not exists public.agent_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null default (now() at time zone 'utc')::date,
  messages    integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.agent_usage enable row level security;

drop policy if exists "read own usage" on public.agent_usage;
create policy "read own usage"
  on public.agent_usage for select
  using (auth.uid() = user_id);

-- Atomic increment that also returns the new total, so two requests racing
-- each other cannot both slip under the daily cap.
create or replace function public.bump_agent_usage(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  insert into public.agent_usage (user_id, day, messages)
  values (p_user, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set messages = public.agent_usage.messages + 1,
                updated_at = now()
  returning messages into new_total;

  return new_total;
end;
$$;

revoke all on function public.bump_agent_usage(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Profiles. Exists so paid plans can be added later without a migration
--    that touches live data: set plan to something other than 'free' and the
--    daily cap changes. Nothing in the app writes plan yet; a payment webhook
--    would be the only thing that does.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  plan           text not null default 'free',
  daily_override integer,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- No write policy: plan changes come from the service role only, so a user
-- cannot upgrade themselves by calling the API directly.

-- Row created automatically on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Returns the daily message cap for an account: the plan default, unless a
-- per-account override is set. Called by the agent route.
create or replace function public.daily_cap(p_user uuid, p_free_default integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  p profiles%rowtype;
begin
  select * into p from public.profiles where user_id = p_user;
  if not found then
    return p_free_default;
  end if;
  if p.daily_override is not null then
    return p.daily_override;
  end if;
  return case p.plan
    when 'plus' then 200
    when 'pro'  then 1000
    else p_free_default
  end;
end;
$$;

revoke all on function public.daily_cap(uuid, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Global circuit breaker.
--
--    Per-account caps stop one person running up a bill. They do not stop a
--    thousand people doing it on the day you get posted somewhere popular.
--    This is a single counter across the whole site, checked before every
--    model call, so the worst possible day has a known cost.
-- ---------------------------------------------------------------------------
create table if not exists public.app_usage (
  day        date primary key default (now() at time zone 'utc')::date,
  messages   integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.app_usage enable row level security;
-- No policies at all: readable and writable only by the service role.

-- Increments the global counter and reports whether the call is still within
-- budget. Returns the new total; the caller compares it to its own limit.
create or replace function public.bump_global_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  insert into public.app_usage (day, messages)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day)
  do update set messages = public.app_usage.messages + 1,
                updated_at = now()
  returning messages into new_total;

  return new_total;
end;
$$;

revoke all on function public.bump_global_usage() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Making your own account unlimited
--
-- Sign in once so the profiles row exists, find your id in the Supabase
-- dashboard under Authentication -> Users, then run:
--
--   update public.profiles
--      set plan = 'pro', daily_override = 1000000
--    where user_id = 'YOUR-UUID-HERE';
--
-- The global circuit breaker above still applies to you. If you want to be
-- exempt from that too, add your id to ADMIN_USER_IDS in the environment.
-- ---------------------------------------------------------------------------
