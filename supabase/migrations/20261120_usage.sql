-- Ledge Desk: count how often each screen is opened (20 Nov 2026).
-- Stores only a day, a screen code and a number: no cookies, no IP address,
-- no account, nothing that identifies a visitor. Visitors can only add 1 to a
-- count through count_visit(); nobody but the service role can read the table.
-- Safe to run more than once.

create table if not exists public.screen_visits (
  day date not null,
  screen text not null,
  visits integer not null default 0,
  primary key (day, screen)
);

alter table public.screen_visits enable row level security;
-- No policies: the browser cannot read or write the table directly.

create or replace function public.count_visit(p_screen text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_screen is null or p_screen !~ '^[A-Z]{2,6}$' then
    return;
  end if;
  insert into public.screen_visits (day, screen, visits)
  values (current_date, p_screen, 1)
  on conflict (day, screen) do update set visits = public.screen_visits.visits + 1;
end;
$$;

revoke all on function public.count_visit(text) from public;
grant execute on function public.count_visit(text) to anon, authenticated;

select 'Usage counting ready' as result;
