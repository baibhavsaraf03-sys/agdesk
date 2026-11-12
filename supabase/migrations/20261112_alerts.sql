-- ===========================================================================
-- Ledge Desk: alerts (ALR)
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is guarded, and nothing here touches the
-- existing tables.
--
-- Three tables, all private to their owner and removed with the account:
--   push_subscriptions  one row per device the visitor turned notifications
--                       on for (the browser's push address and its keys)
--   alerts              what the visitor asked to be told about
--   alert_events        what was sent, for the "recent alerts" list
--
-- The checker (scripts/alerts-check.mjs, run by GitHub Actions) uses the
-- service-role key, which bypasses these policies; visitors only ever reach
-- their own rows.
-- ===========================================================================

create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  constraint push_endpoint_shape check (endpoint like 'https://%' and length(endpoint) <= 1000),
  constraint push_keys_shape check (length(p256dh) <= 200 and length(auth) <= 100)
);
create index if not exists push_subscriptions_user on public.push_subscriptions(user_id);

create table if not exists public.alerts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('release', 'price', 'headline', 'doom')),
  params        jsonb not null default '{}'::jsonb,
  state         jsonb not null default '{}'::jsonb,
  active        boolean not null default true,
  last_fired_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint alerts_params_size check (pg_column_size(params) <= 2000),
  constraint alerts_state_size check (pg_column_size(state) <= 20000)
);
create index if not exists alerts_user on public.alerts(user_id);
create index if not exists alerts_active on public.alerts(active) where active;

create table if not exists public.alert_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  alert_id   bigint references public.alerts(id) on delete set null,
  title      text not null,
  body       text not null default '',
  url        text not null default '/#ALR',
  delivered  integer not null default 0,
  sent_at    timestamptz not null default now()
);
create index if not exists alert_events_user on public.alert_events(user_id, sent_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_events enable row level security;

-- push_subscriptions: own rows only.
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- alerts: own rows only. The visitor may not write `state` or `last_fired_at`
-- in a way that matters: the checker owns them and overwrites them.
drop policy if exists "own alerts" on public.alerts;
create policy "own alerts"
  on public.alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- alert_events: the visitor reads and clears their own; only the checker writes.
drop policy if exists "read own alert events" on public.alert_events;
create policy "read own alert events"
  on public.alert_events for select
  using (auth.uid() = user_id);
drop policy if exists "delete own alert events" on public.alert_events;
create policy "delete own alert events"
  on public.alert_events for delete
  using (auth.uid() = user_id);

revoke all on public.push_subscriptions, public.alerts, public.alert_events from anon;
grant select, insert, update, delete on public.push_subscriptions, public.alerts to authenticated;
grant select, delete on public.alert_events to authenticated;
grant usage on all sequences in schema public to authenticated;

-- At most 25 alerts and 10 devices per account, enforced here as well as in
-- the application.
create or replace function public.alerts_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.alerts where user_id = new.user_id) >= 25 then
    raise exception 'alert limit reached';
  end if;
  return new;
end $$;
drop trigger if exists alerts_limit on public.alerts;
create trigger alerts_limit before insert on public.alerts for each row execute function public.alerts_limit();

create or replace function public.push_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    delete from public.push_subscriptions
     where id = (select id from public.push_subscriptions where user_id = new.user_id order by created_at asc limit 1);
  end if;
  return new;
end $$;
drop trigger if exists push_limit on public.push_subscriptions;
create trigger push_limit before insert on public.push_subscriptions for each row execute function public.push_limit();

select 'Alerts ready' as result;
