-- ===========================================================================
-- Ledge Desk: reviewed articles (/articles)
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement is guarded, and nothing here touches the
-- existing tables (market_reads, journal, agent_usage, profiles, app_usage).
--
-- What the database enforces, so the application cannot get it wrong:
--  * Anyone, signed in or not, can read an article once it is published.
--  * A signed-in account can submit, and a submission always starts as
--    'pending'. Nobody can insert an article that is already published.
--  * An author can read their own submissions and withdraw one that is still
--    pending. They cannot edit it or change its status.
--  * Only an editor (a row in article_editors) can read the queue, publish,
--    reject or unpublish. article_editors has no policies at all, so it can
--    only be changed from this SQL editor.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Editors. One row per account allowed to review.
-- ---------------------------------------------------------------------------
create table if not exists public.article_editors (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  added_at  timestamptz not null default now()
);

alter table public.article_editors enable row level security;
-- No policies: invisible and unwritable to every visitor, signed in or not.

revoke all on public.article_editors from anon, authenticated;

-- True when the caller is an editor. Security definer so it can read the
-- table above, which the caller cannot.
create or replace function public.is_article_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.article_editors where user_id = auth.uid());
$$;

revoke all on function public.is_article_editor() from public;
grant execute on function public.is_article_editor() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Articles.
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references auth.users(id) on delete set null,
  author_name   text not null,
  title         text not null,
  summary       text not null,
  body          text not null,
  status        text not null default 'pending',
  slug          text,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  published_at  timestamptz,

  constraint articles_status_check  check (status in ('pending', 'published', 'rejected')),
  constraint articles_name_check    check (char_length(author_name) between 2 and 80),
  constraint articles_title_check   check (char_length(title) between 10 and 140),
  constraint articles_summary_check check (char_length(summary) between 40 and 300),
  constraint articles_body_check    check (char_length(body) between 1200 and 40000),
  constraint articles_slug_check    check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_note_check    check (review_note is null or char_length(review_note) <= 2000),
  -- A published article always has an address and a date.
  constraint articles_published_check
    check (status <> 'published' or (slug is not null and published_at is not null))
);

create unique index if not exists articles_slug_key
  on public.articles (slug) where slug is not null;

create index if not exists articles_published_idx
  on public.articles (published_at desc) where status = 'published';

create index if not exists articles_queue_idx
  on public.articles (status, created_at);

create index if not exists articles_author_idx
  on public.articles (author_id, created_at desc);

alter table public.articles enable row level security;

revoke all on public.articles from anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

-- Reading -------------------------------------------------------------------
drop policy if exists "published articles are world readable" on public.articles;
create policy "published articles are world readable"
  on public.articles for select
  using (status = 'published');

drop policy if exists "authors read their own articles" on public.articles;
create policy "authors read their own articles"
  on public.articles for select
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "editors read every article" on public.articles;
create policy "editors read every article"
  on public.articles for select
  to authenticated
  using (public.is_article_editor());

-- Submitting ----------------------------------------------------------------
-- The check pins every review field, so a submission cannot arrive already
-- published, already slugged or carrying a forged review.
drop policy if exists "signed-in accounts submit pending articles" on public.articles;
create policy "signed-in accounts submit pending articles"
  on public.articles for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and status = 'pending'
    and slug is null
    and review_note is null
    and reviewed_at is null
    and published_at is null
  );

-- Reviewing -----------------------------------------------------------------
drop policy if exists "editors review articles" on public.articles;
create policy "editors review articles"
  on public.articles for update
  to authenticated
  using (public.is_article_editor())
  with check (public.is_article_editor());

-- Withdrawing and deleting --------------------------------------------------
drop policy if exists "authors withdraw pending articles" on public.articles;
create policy "authors withdraw pending articles"
  on public.articles for delete
  to authenticated
  using (author_id = auth.uid() and status = 'pending');

drop policy if exists "editors delete articles" on public.articles;
create policy "editors delete articles"
  on public.articles for delete
  to authenticated
  using (public.is_article_editor());

-- ---------------------------------------------------------------------------
-- 3. Housekeeping triggers.
-- ---------------------------------------------------------------------------

-- Keeps the queue reviewable by one person: an account may have at most three
-- articles waiting at a time. Editors are exempt.
create or replace function public.articles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_id is not null
     and not exists (select 1 from public.article_editors where user_id = new.author_id)
     and (select count(*) from public.articles
           where author_id = new.author_id and status = 'pending') >= 3 then
    raise exception 'pending_limit' using errcode = 'P0001';
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists articles_before_insert on public.articles;
create trigger articles_before_insert
  before insert on public.articles
  for each row execute function public.articles_before_insert();

create or replace function public.articles_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  -- Who wrote it and when it arrived never change after submission.
  new.author_id  := old.author_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists articles_before_update on public.articles;
create trigger articles_before_update
  before update on public.articles
  for each row execute function public.articles_before_update();

-- ---------------------------------------------------------------------------
-- 4. Naming the editor.
--
--    Looks the account up by its sign-in address, so no id has to be copied
--    by hand. Callable only from this SQL editor: every web role is revoked.
--    The address itself is not kept in this repository; the owner's copy of
--    this script ends with one extra line that calls the function.
-- ---------------------------------------------------------------------------
create or replace function public.set_article_editor(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then
    return 'NOT SET: no account has signed in to the site with ' || p_email
        || ' yet. Sign in once with Google on the site, then run this script again.';
  end if;
  insert into public.article_editors (user_id) values (uid)
  on conflict (user_id) do nothing;
  return 'Editor set: ' || p_email || '. The review queue is at /articles/review.';
end;
$$;

revoke all on function public.set_article_editor(text) from public, anon, authenticated;
