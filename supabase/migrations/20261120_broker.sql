-- ===========================================================================
-- Ledge Desk: linked brokerage accounts (POS, "My positions")
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run.
--
-- One row per account that has linked a broker through SnapTrade (read-only).
-- `tokens` is ciphertext: the server encrypts the SnapTrade tokens before
-- saving them, so even the row's owner only ever sees scrambled text.
-- Positions themselves are never stored. The row goes with the account.
-- ===========================================================================

create table if not exists public.broker_links (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  provider   text not null default 'snaptrade' check (provider in ('snaptrade')),
  tokens     text not null check (length(tokens) < 8000),
  linked_at  timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.broker_links enable row level security;

drop policy if exists "read own broker link" on public.broker_links;
create policy "read own broker link" on public.broker_links for select using (auth.uid() = user_id);

drop policy if exists "insert own broker link" on public.broker_links;
create policy "insert own broker link" on public.broker_links for insert with check (auth.uid() = user_id);

drop policy if exists "update own broker link" on public.broker_links;
create policy "update own broker link" on public.broker_links for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own broker link" on public.broker_links;
create policy "delete own broker link" on public.broker_links for delete using (auth.uid() = user_id);

revoke all on public.broker_links from anon;
grant select, insert, update, delete on public.broker_links to authenticated;

select 'Broker linking ready' as result;
