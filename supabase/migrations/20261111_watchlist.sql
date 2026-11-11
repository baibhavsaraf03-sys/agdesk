-- ===========================================================================
-- Ledge Desk: watchlist (WL)
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is guarded, and nothing here touches the
-- existing tables.
--
-- One row per account: an ordered list of TradingView symbols. The row is
-- private to its owner, enforced here rather than in application code, and
-- goes with the account when the account is deleted.
-- ===========================================================================

create table if not exists public.watchlist (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  symbols     jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  -- A list, and a short one. The application allows 40; this is the backstop.
  constraint watchlist_symbols_shape
    check (jsonb_typeof(symbols) = 'array' and jsonb_array_length(symbols) <= 60 and pg_column_size(symbols) <= 8000)
);

alter table public.watchlist enable row level security;

drop policy if exists "read own watchlist" on public.watchlist;
create policy "read own watchlist"
  on public.watchlist for select
  using (auth.uid() = user_id);

drop policy if exists "insert own watchlist" on public.watchlist;
create policy "insert own watchlist"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own watchlist" on public.watchlist;
create policy "update own watchlist"
  on public.watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own watchlist" on public.watchlist;
create policy "delete own watchlist"
  on public.watchlist for delete
  using (auth.uid() = user_id);

revoke all on public.watchlist from anon;
grant select, insert, update, delete on public.watchlist to authenticated;

select 'Watchlist ready' as result;
