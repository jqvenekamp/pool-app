create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text,
  active boolean not null default true,
  stars numeric(4,2) not null default 1.00 check (stars >= 1 and stars <= 5),
  games_played integer not null default 0 check (games_played >= 0),
  rounds_won integer not null default 0 check (rounds_won >= 0),
  rounds_lost integer not null default 0 check (rounds_lost >= 0),
  current_win_streak integer not null default 0 check (current_win_streak >= 0),
  best_win_streak integer not null default 0 check (best_win_streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (display_name)
);

create table if not exists public.pool_matches (
  id uuid primary key default gen_random_uuid(),
  player_one_id uuid not null references public.players(id) on delete restrict,
  player_two_id uuid not null references public.players(id) on delete restrict,
  player_one_rounds integer not null check (player_one_rounds >= 0),
  player_two_rounds integer not null check (player_two_rounds >= 0),
  played_at timestamptz not null default now(),
  notes text,
  under_table_player_id uuid references public.players(id) on delete set null,
  under_table_challenge_status text not null default 'none'
    check (under_table_challenge_status in ('none','pending','accepted','rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pool_matches_distinct_players check (player_one_id <> player_two_id),
  constraint pool_matches_has_rounds check ((player_one_rounds + player_two_rounds) > 0)
);

create table if not exists public.pool_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pool_matches(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  winner_id uuid not null references public.players(id) on delete restrict,
  loser_id uuid not null references public.players(id) on delete restrict,
  under_table boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, round_number),
  constraint pool_rounds_distinct_players check (winner_id <> loser_id)
);

create table if not exists public.rating_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pool_matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  opponent_id uuid not null references public.players(id) on delete cascade,
  stars_before numeric(4,2) not null,
  stars_after numeric(4,2) not null,
  delta numeric(5,3) not null,
  expected_score numeric(5,4) not null,
  actual_score numeric(5,4) not null,
  formula_version text not null default 'star_elo_v1',
  created_at timestamptz not null default now()
);

create table if not exists public.medals (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_medals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  medal_id uuid not null references public.medals(id) on delete cascade,
  match_id uuid references public.pool_matches(id) on delete set null,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.medal_challenges (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pool_matches(id) on delete cascade,
  medal_key text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists players_ladder_idx on public.players(active, stars desc, rounds_won desc);
create unique index if not exists players_display_name_lower_idx on public.players (lower(display_name));
create index if not exists pool_matches_played_at_idx on public.pool_matches(played_at desc);
create index if not exists pool_matches_player_one_idx on public.pool_matches(player_one_id, played_at desc);
create index if not exists pool_matches_player_two_idx on public.pool_matches(player_two_id, played_at desc);
create index if not exists rating_events_player_idx on public.rating_events(player_id, created_at desc);
create index if not exists player_medals_player_idx on public.player_medals(player_id, awarded_at desc);

alter table public.players enable row level security;
alter table public.pool_matches enable row level security;
alter table public.pool_rounds enable row level security;
alter table public.rating_events enable row level security;
alter table public.medals enable row level security;
alter table public.player_medals enable row level security;
alter table public.medal_challenges enable row level security;

drop policy if exists players_read on public.players;
drop policy if exists matches_read on public.pool_matches;
drop policy if exists rounds_read on public.pool_rounds;
drop policy if exists rating_events_read on public.rating_events;
drop policy if exists medals_read on public.medals;
drop policy if exists player_medals_read on public.player_medals;
drop policy if exists medal_challenges_read on public.medal_challenges;

create policy players_read on public.players for select to anon, authenticated using (true);
create policy matches_read on public.pool_matches for select to anon, authenticated using (true);
create policy rounds_read on public.pool_rounds for select to anon, authenticated using (true);
create policy rating_events_read on public.rating_events for select to anon, authenticated using (true);
create policy medals_read on public.medals for select to anon, authenticated using (true);
create policy player_medals_read on public.player_medals for select to anon, authenticated using (true);
create policy medal_challenges_read on public.medal_challenges for select to anon, authenticated using (true);

insert into public.medals (key, name, description, icon) values
('winner_first_win', 'Winner!', 'Awarded for winning your first round.', 'trophy'),
('winning_streak_3', 'Winning Streak', 'Awarded for 3 consecutive round wins.', 'flame'),
('bloodthirsty_5', 'Bloodthirsty', 'Awarded for 5 consecutive round wins.', 'skull'),
('merciless_10', 'Merciless', 'Awarded for 10 consecutive match wins.', 'crosshair'),
('ruthless_15', 'Ruthless', 'Awarded for 15 consecutive match wins.', 'target'),
('relentless_20', 'Relentless', 'Awarded for 20 consecutive match wins.', 'zap'),
('brutal_25', 'Brutal', 'Awarded for 25 consecutive match wins.', 'axe'),
('nuclear_30', 'Nuclear', 'Awarded for 30 consecutive match wins.', 'atom'),
('payback', 'Payback', 'Awarded for beating someone who beat you before.', 'rotate-ccw'),
('under_table', 'Onder de tafel door', 'Awarded when a player wins a round while the opponent pots zero balls.', 'badge-alert'),
('giant_slayer', 'Giant Slayer', 'Awarded for beating a player at least 1.5 stars higher.', 'sword'),
('clean_sweep', 'Clean Sweep', 'Awarded for winning a multi-round match without losing a round.', 'sparkles')
on conflict (key) do nothing;
