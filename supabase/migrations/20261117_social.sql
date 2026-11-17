-- Ledge Desk: Instagram posting, the scheduler (again, safely) and a status check (17 Nov 2026).
--
-- Paste all of this into Supabase > SQL Editor > New query and press Run.
-- It is safe to run more than once. The last result is a checklist: every
-- line should say "yes". Any line that doesn't tells you what to do next.
-- To see the checklist again later, run just:   select * from public.ledge_check();

-- 1. Instagram: a log of posts and the stored token. Row-level security on
--    and no policies, so only the server-side jobs (service role) can read
--    or write them; visitors never can.
create table if not exists public.social_posts (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  day         date not null,
  slot        int,
  kind        text,
  status      text not null check (status in ('posted', 'partial', 'failed')),
  reel_id     text,
  story_id    text,
  permalink   text,
  video_url   text,
  caption     text,
  error       text
);
alter table public.social_posts enable row level security;
create index if not exists social_posts_day on public.social_posts (day);

create table if not exists public.social_tokens (
  name          text primary key,
  token         text not null,
  seed_hash     text,
  refreshed_at  timestamptz,
  expires_at    timestamptz
);
alter table public.social_tokens enable row level security;

-- 2. Public storage for the videos (Instagram fetches each one from a public address).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social', 'social', true, 104857600, array['video/mp4', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 3. The checklist. Reports only yes/no and short messages, never a secret.
create or replace function public.ledge_check()
returns table (item text, result text, todo text)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n int; code int; msg text; t timestamptz; r record;
begin
  item := 'Scheduler switched on (pg_cron)';
  if exists (select 1 from pg_extension where extname = 'pg_cron') then result := 'yes'; todo := '';
  else result := 'NO'; todo := 'Database > Extensions, search pg_cron, switch it on, then run this script again.'; end if;
  return next;

  item := 'Web requests switched on (pg_net)';
  if exists (select 1 from pg_extension where extname = 'pg_net') then result := 'yes'; todo := '';
  else result := 'NO'; todo := 'Database > Extensions, search pg_net, switch it on, then run this script again.'; end if;
  return next;

  item := 'GitHub token in the Vault, named github_dispatch';
  begin
    execute 'select count(*) from vault.secrets where name = ''github_dispatch''' into n;
  exception when others then n := -1; end;
  if n > 0 then result := 'yes'; todo := '';
  elsif n = 0 then
    result := 'NO';
    execute 'select string_agg(name, '', '') from vault.secrets' into msg;
    todo := 'Add it in Vault with the name github_dispatch exactly.' || coalesce(' Names found: ' || msg, ' The Vault is empty.');
  else result := 'NO'; todo := 'The Vault could not be read. Search for Vault in the dashboard and open it once, then run this again.'; end if;
  return next;

  item := 'Schedules set up (5 expected)';
  if to_regclass('cron.job') is not null then
    execute 'select count(*) from cron.job where jobname like ''ledge-%'' and active' into n;
    result := case when n >= 5 then 'yes' else 'NO' end;
    todo := case when n >= 5 then n || ' schedules' else 'Only ' || n || ' found. Run this script again.' end;
  else result := 'NO'; todo := 'Switch on pg_cron first (line 1).'; end if;
  return next;

  item := 'GitHub accepted the last start';
  if to_regclass('net._http_response') is not null then
    execute 'select status_code, left(coalesce(content, error_msg, ''''), 160), created from net._http_response order by id desc limit 1' into code, msg, t;
    if code is null and t is null then result := 'not yet'; todo := 'Wait five minutes, then run: select * from public.ledge_check();';
    elsif code = 204 then result := 'yes'; todo := 'Last start ' || to_char(t at time zone 'Europe/London', 'DD Mon HH24:MI') || ' London time.';
    elsif code = 401 then result := 'NO'; todo := 'GitHub says the token is wrong or expired. Make a new one (Step 8a) and replace the Vault secret.';
    elsif code = 403 then result := 'NO'; todo := 'GitHub says the token may not start jobs. Edit the token: Repository permissions > Actions > Read and write.';
    elsif code = 404 then result := 'NO'; todo := 'GitHub cannot see the repository with this token. Edit the token: Repository access > Only select repositories > agdesk.';
    else result := 'NO'; todo := 'GitHub answered ' || coalesce(code::text, 'nothing') || ': ' || coalesce(msg, ''); end if;
  else result := 'NO'; todo := 'Switch on pg_net first (line 2).'; end if;
  return next;

  item := 'Video storage for Instagram';
  if exists (select 1 from storage.buckets where id = 'social' and public) then result := 'yes'; todo := '';
  else result := 'NO'; todo := 'Run this script again.'; end if;
  return next;

  item := 'Instagram connected';
  select * into r from public.social_tokens where name = 'instagram';
  if found then result := 'yes'; todo := 'Token last renewed ' || to_char(r.refreshed_at at time zone 'Europe/London', 'DD Mon') || '; it renews itself every week.';
  else result := 'not yet'; todo := 'Step 9: put the Instagram token in GitHub as INSTAGRAM_TOKEN; the first post fills this in.'; end if;
  return next;

  item := 'Last Instagram post';
  select * into r from public.social_posts order by id desc limit 1;
  if not found then result := 'none yet'; todo := 'The first post goes out at 17:40 UK time once Instagram is connected.';
  else
    result := case r.status when 'posted' then 'yes' when 'partial' then 'Reel only' else 'FAILED' end;
    todo := to_char(r.created_at at time zone 'Europe/London', 'DD Mon HH24:MI') || ' · ' || r.kind || coalesce(' · ' || r.permalink, '') || coalesce(' · ' || r.error, '');
  end if;
  return next;
end;
$fn$;
revoke all on function public.ledge_check() from public, anon, authenticated;
grant execute on function public.ledge_check() to service_role;

-- 4. The scheduler. Runs only if pg_cron and pg_net can be switched on;
--    if not, the checklist below says what to do instead of an error.
do $sched$
begin
  begin
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
  exception when others then
    raise notice 'Could not switch on pg_cron/pg_net here (%). Use Database > Extensions.', sqlerrm;
    return;
  end;

  execute $f$
    create or replace function public.dispatch_workflow(wf text)
    returns bigint
    language plpgsql
    security definer
    set search_path = public, extensions
    as $body$
    declare tok text;
    begin
      select decrypted_secret into tok from vault.decrypted_secrets where name = 'github_dispatch' limit 1;
      if tok is null then
        raise warning 'Ledge Desk scheduler: no github_dispatch secret in the Vault';
        return null;
      end if;
      return net.http_post(
        url := 'https://api.github.com/repos/baibhavsaraf03-sys/agdesk/actions/workflows/' || wf || '/dispatches',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || trim(tok),
          'Accept', 'application/vnd.github+json',
          'X-GitHub-Api-Version', '2022-11-28',
          'User-Agent', 'ledge-desk-scheduler',
          'Content-Type', 'application/json'),
        body := jsonb_build_object('ref', 'main'));
    end;
    $body$ $f$;
  execute 'revoke all on function public.dispatch_workflow(text) from public, anon, authenticated';

  -- Times are UTC (the same as UK time in winter, an hour earlier in summer).
  perform cron.unschedule(jobname) from cron.job where jobname = 'ledge-daily-reel';
  perform cron.schedule('ledge-alerts',       '*/5 * * * *',      $j$select public.dispatch_workflow('alerts.yml')$j$);
  perform cron.schedule('ledge-market-reads', '23 * * * *',       $j$select public.dispatch_workflow('feed.yml')$j$);
  perform cron.schedule('ledge-meme-read',    '41 * * * *',       $j$select public.dispatch_workflow('meme.yml')$j$);
  perform cron.schedule('ledge-news-notes',   '5 6,12,22 * * *',  $j$select public.dispatch_workflow('notes.yml')$j$);
  perform cron.schedule('ledge-instagram',    '40 17 * * *',      $j$select public.dispatch_workflow('instagram.yml')$j$);
  -- Start the alert checker once right now, so the checklist has an answer from GitHub to show.
  perform public.dispatch_workflow('alerts.yml');
end
$sched$;

-- 5. The checklist (wait a few seconds and run "select * from public.ledge_check();" again
--    if the GitHub line says "not yet").
select * from public.ledge_check();
