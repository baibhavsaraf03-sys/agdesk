-- Profiles table: stores subscription status alongside auth.
-- Run this in the Supabase SQL editor.

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  plan                  text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id    text,
  stripe_subscription_id text,
  stripe_status         text,
  current_period_end    timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Every signed-in user can read their own row.
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Only the service role (webhook) can insert or update.
-- The anon/authenticated role gets select only.
create policy "Service role manages profiles"
  on public.profiles for all
  using (true)
  with check (true);

-- Auto-create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if any, then create.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
