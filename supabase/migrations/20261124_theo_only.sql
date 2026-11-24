-- ===========================================================================
-- Ledge Desk: one video a day, Fix Theo, ready about 8am UK time (24 Nov)
--
-- Paste the whole file into the Supabase SQL editor and run it once.
-- Safe to re-run. Replaces the 20 Nov three-video schedule.
--
-- Theo gets about ten times the views of the other formats, so the daily post
-- and Up or Down stop running on their own (the market game is now inside
-- each Theo episode). Both can still be run by hand from GitHub Actions.
-- Theo starts at 07:45 UK time and reaches the phone around 8am; the job is
-- set for both UTC hours that can be 07:45 in the UK, and goes ahead only when
-- the UK clock agrees, so nothing changes when the clocks go forward or back.
-- ===========================================================================

select cron.unschedule(jobname) from cron.job where jobname in ('ledge-instagram', 'ledge-updown');

select cron.schedule('ledge-cartoon', '45 6,7 * * *',
  $j$select public.dispatch_workflow('cartoon.yml') where extract(hour from now() at time zone 'Europe/London') = 7$j$);

select jobname as "job", schedule as "runs at (UTC)" from cron.job
where jobname like 'ledge-%' order by jobname;
