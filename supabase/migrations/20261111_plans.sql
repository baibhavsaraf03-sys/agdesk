-- ===========================================================================
-- Paid plans: Free, Plus ($20/month), Pro ($100/month).
--
-- Run this once in the Supabase SQL editor. It is safe to run again.
--
--   Free   20 analyst messages a day.
--   Plus   the same 20 a day, plus 100 more each calendar month.
--   Pro    the same 20 a day, plus 500 more each calendar month.
--
-- The daily messages are always spent first. The monthly allowance is only
-- touched once the day's free ones are gone, and it resets on the 1st (UTC).
--
-- It also repairs two things left by earlier scripts:
--   * schema.sql and the first profiles migration disagreed about the key
--     column (user_id vs id) and about which columns exist. This settles on
--     user_id and adds whatever is missing, whichever script ran first.
--   * the first migration created a policy named "Service role manages
--     profiles" with no role attached, which lets ANY signed-in user rewrite
--     any profile, including setting their own plan to a paid one. It is
--     dropped here. The service role bypasses row security and never needed it.
-- ===========================================================================

-- 1. One shape for profiles -------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'id')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id') then
    alter table public.profiles rename column id to user_id;
  end if;
end $$;

alter table public.profiles add column if not exists daily_override         integer;
alter table public.profiles add column if not exists stripe_customer_id     text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists stripe_status          text;
alter table public.profiles add column if not exists current_period_end     timestamptz;
alter table public.profiles add column if not exists updated_at             timestamptz default now();

alter table public.profiles drop constraint if exists profiles_plan_check;
-- Anything that is not a known plan becomes free rather than blocking the constraint.
update public.profiles set plan = 'free' where plan not in ('free', 'plus', 'pro');
alter table public.profiles add constraint profiles_plan_check check (plan in ('free', 'plus', 'pro'));

create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);

-- 2. Close the write hole ---------------------------------------------------
drop policy if exists "Service role manages profiles" on public.profiles;
drop policy if exists "Users can read own profile"   on public.profiles;
drop policy if exists "read own profile"             on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

alter table public.profiles enable row level security;

-- 3. New accounts get a row -------------------------------------------------
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

-- Accounts created before the trigger existed.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- 4. Monthly allowance ------------------------------------------------------
-- The daily counter normally exists already (schema.sql). Created here too so
-- this file stands on its own.
create table if not exists public.agent_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null default (now() at time zone 'utc')::date,
  messages    integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.agent_usage enable row level security;

create table if not exists public.agent_extra_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       date not null,
  messages    integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.agent_extra_usage enable row level security;

drop policy if exists "read own extra usage" on public.agent_extra_usage;
create policy "read own extra usage"
  on public.agent_extra_usage for select
  using (auth.uid() = user_id);

create or replace function public.plan_monthly_extra(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan when 'plus' then 100 when 'pro' then 500 else 0 end;
$$;

-- 5. Spend one message ------------------------------------------------------
-- One atomic call per question. Counts it against today's free messages
-- first and the month's paid allowance second, and reports what is left, so
-- two requests racing each other cannot both slip through.
create or replace function public.use_agent_message(p_user uuid, p_free_daily integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p          public.profiles%rowtype;
  v_plan     text := 'free';
  v_daily    integer := p_free_daily;
  v_extra    integer := 0;
  v_today    date := (now() at time zone 'utc')::date;
  v_month    date := date_trunc('month', now() at time zone 'utc')::date;
  v_used_day integer;
  v_used_mon integer := 0;
begin
  select * into p from public.profiles where user_id = p_user;
  if found then
    v_plan := coalesce(p.plan, 'free');
    if p.daily_override is not null then v_daily := p.daily_override; end if;
  end if;
  v_extra := public.plan_monthly_extra(v_plan);

  select coalesce(messages, 0) into v_used_mon
    from public.agent_extra_usage where user_id = p_user and month = v_month;
  v_used_mon := coalesce(v_used_mon, 0);

  insert into public.agent_usage (user_id, day, messages)
  values (p_user, v_today, 1)
  on conflict (user_id, day)
  do update set messages = public.agent_usage.messages + 1, updated_at = now()
  returning messages into v_used_day;

  if v_used_day <= v_daily then
    return jsonb_build_object('allowed', true, 'source', 'daily', 'plan', v_plan,
      'daily_left', v_daily - v_used_day, 'extra_left', greatest(v_extra - v_used_mon, 0));
  end if;

  if v_extra > 0 then
    insert into public.agent_extra_usage (user_id, month, messages)
    values (p_user, v_month, 1)
    on conflict (user_id, month)
    do update set messages = public.agent_extra_usage.messages + 1, updated_at = now()
      where public.agent_extra_usage.messages < v_extra
    returning messages into v_used_mon;

    if found then
      return jsonb_build_object('allowed', true, 'source', 'extra', 'plan', v_plan,
        'daily_left', 0, 'extra_left', greatest(v_extra - v_used_mon, 0));
    end if;
  end if;

  return jsonb_build_object('allowed', false, 'source', 'none', 'plan', v_plan,
    'daily_left', 0, 'extra_left', 0);
end;
$$;

revoke all on function public.use_agent_message(uuid, integer) from public, anon, authenticated;

-- 6. What the settings screen shows -----------------------------------------
-- Read-only, and only ever about the caller.
create or replace function public.my_usage(p_free_daily integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  p       public.profiles%rowtype;
  v_plan  text := 'free';
  v_daily integer := p_free_daily;
  v_day   integer := 0;
  v_mon   integer := 0;
begin
  if v_user is null then return null; end if;
  select * into p from public.profiles where user_id = v_user;
  if found then
    v_plan := coalesce(p.plan, 'free');
    if p.daily_override is not null then v_daily := p.daily_override; end if;
  end if;
  select coalesce(max(messages), 0) into v_day from public.agent_usage
    where user_id = v_user and day = (now() at time zone 'utc')::date;
  select coalesce(max(messages), 0) into v_mon from public.agent_extra_usage
    where user_id = v_user and month = date_trunc('month', now() at time zone 'utc')::date;
  return jsonb_build_object(
    'plan', v_plan,
    'daily_left', greatest(v_daily - v_day, 0),
    'extra_left', greatest(public.plan_monthly_extra(v_plan) - v_mon, 0),
    'extra_total', public.plan_monthly_extra(v_plan),
    'renews', p.current_period_end,
    'status', p.stripe_status
  );
end;
$$;

revoke all on function public.my_usage(integer) from public, anon;
grant execute on function public.my_usage(integer) to authenticated;
