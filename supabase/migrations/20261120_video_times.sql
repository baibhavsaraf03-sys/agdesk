-- ===========================================================================
-- Ledge Desk: the three daily videos at 8am, 12pm and 4pm UK time (20 Nov)
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run.
--
-- Each video starts rendering at quarter to the hour so it reaches the phone
-- around the hour:  Fix Theo 07:45 -> about 8am,  the daily post 11:45 ->
-- about 12pm,  Up or Down 15:45 -> about 4pm.
-- The scheduler runs in UTC, so each job is set for both UTC hours that can be
-- that UK hour (winter and summer) and only goes ahead when the UK clock
-- agrees. No change needed when the clocks go forward or back.
-- ===========================================================================

select cron.schedule('ledge-cartoon', '45 6,7 * * *',
  $j$select public.dispatch_workflow('cartoon.yml') where extract(hour from now() at time zone 'Europe/London') = 7$j$);

select cron.schedule('ledge-instagram', '45 10,11 * * *',
  $j$select public.dispatch_workflow('instagram.yml') where extract(hour from now() at time zone 'Europe/London') = 11$j$);

select cron.schedule('ledge-updown', '45 14,15 * * *',
  $j$select public.dispatch_workflow('updown.yml') where extract(hour from now() at time zone 'Europe/London') = 15$j$);

select jobname as "video", schedule as "runs at (UTC)",
  case jobname when 'ledge-cartoon' then 'Fix Theo, about 8am UK'
               when 'ledge-instagram' then 'Daily post, about 12pm UK'
               when 'ledge-updown' then 'Up or Down, about 4pm UK' end as "arrives"
from cron.job where jobname in ('ledge-cartoon', 'ledge-instagram', 'ledge-updown')
order by schedule;
