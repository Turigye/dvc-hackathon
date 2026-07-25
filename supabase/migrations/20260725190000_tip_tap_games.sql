create extension if not exists pgcrypto;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  score_cap integer not null check (score_cap > 0),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  device_id text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (auth_user_id is not null or device_id is not null)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  round_id text not null unique,
  score integer not null check (score >= 0),
  duration_ms integer not null check (duration_ms > 0),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at asc);
create index scores_player_created_idx on public.scores (player_id, created_at desc);

alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.scores enable row level security;

-- Browser clients never access these tables directly. All reads and writes pass through
-- authenticated server routes using the service role; RLS remains a protective default.

insert into public.games (slug, label, score_cap) values
  ('switchback', 'Switchback', 4000),
  ('skyline', 'Skyline', 4000),
  ('pulse', 'Pulse', 6000),
  ('reflex', 'Reflex', 6000),
  ('slice', 'Slice', 9000),
  ('color-rings', 'Color Rings', 3000)
on conflict (slug) do update set label = excluded.label, score_cap = excluded.score_cap;
