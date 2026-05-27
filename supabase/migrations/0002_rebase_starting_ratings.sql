alter table public.players
  alter column stars set default 2.00;

alter table public.rating_events
  alter column formula_version set default 'star_elo_v2';

update public.players
set
  stars = least(5.00, stars + 1.00),
  updated_at = now();
