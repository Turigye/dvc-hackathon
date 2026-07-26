-- Brings the live database in line with the app.
--
-- 1. Guest ids are not UUIDs. LAN/HTTP previews have no Web Crypto, so
--    `createClientId` falls back to `guest-<base36>-<base36>`. Both id columns
--    become text so guest scores can persist.
-- 2. The slug CHECK constraint blocked adding games without a schema change.
-- 3. Reseeds the games table with the current line-up.
--
-- Safe to run more than once.

alter table public.players  alter column device_id type text using device_id::text;
alter table public.scores   alter column round_id  type text using round_id::text;

do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.games'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%slug%';
  if constraint_name is not null then
    execute format('alter table public.games drop constraint %I', constraint_name);
  end if;
end $$;

delete from public.scores where game_id in (select id from public.games where slug in ('burn-in', 'lcd-run', 'signal-lock', 'beat-drop', 'slipstream', 'blinkstack', 'stack'));
delete from public.games where slug in ('burn-in', 'lcd-run', 'signal-lock', 'beat-drop', 'slipstream', 'blinkstack', 'stack');

insert into public.games (slug, label, score_cap) values
  ('switchback',  'Switchback',  4000),
  ('skyline',     'Skyline',     4000),
  ('pulse',       'Pulse',       6000),
  ('reflex',      'Reflex',      6000),
  ('overload',    'Overload',    6000),
  ('swarm',       'Swarm',       6000),
  ('slice',       'Slice',       9000),
  ('color-rings', 'Color Rings', 3000)
on conflict (slug) do update set label = excluded.label, score_cap = excluded.score_cap;
