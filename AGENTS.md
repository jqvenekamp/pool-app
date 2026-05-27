# AGENTS.md - Pool Ladder App Build Guide

## Project Mission
Build a mobile-first office pool ladder app using the same architectural style as this repository: Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres/RLS, and Vercel deployment.

The app lets colleagues record pool results and view a fancy competitive ladder. It should feel quick enough to use immediately after a game, but polished enough that people enjoy checking the rankings, medals, streaks, and rivalries.

## Default Tech Stack
Use this stack unless the user explicitly asks otherwise:

- Framework: Next.js App Router with TypeScript
- Styling: Tailwind CSS with custom CSS variables and mobile-first responsive layouts
- Hosting: Vercel
- Backend: Supabase Postgres with Row Level Security
- Auth: Supabase Auth, preferably Google login for workplace identity
- Validation: Zod for route input validation
- Icons: lucide-react
- Charts/visuals: Recharts only if useful; CSS-first visuals are preferred for the ladder
- Runtime: Node.js route handlers for app APIs

Keep the implementation simple and product-focused. This is not an AI-agent app unless specifically requested; it is a score-entry and ranking app.

## Suggested Repository Structure
Use this structure for a fresh project:

```txt
app/
  layout.tsx
  globals.css
  page.tsx
  login/page.tsx
  pool/page.tsx
  api/pool/matches/route.ts
  api/pool/players/route.ts
  api/pool/medals/challenge/route.ts
components/
  LoginPanel.tsx
  pool/PoolWorkspace.tsx
  pool/AddScoreTab.tsx
  pool/LadderTab.tsx
  pool/PlayerSelect.tsx
  pool/ScorePicker.tsx
  pool/MedalBadge.tsx
  pool/PlayerMedalDrawer.tsx
  pool/TopThreePodium.tsx
  shell/AppShell.tsx
lib/
  pool/rating.ts
  pool/medals.ts
  pool/ladder.ts
  supabase/client.ts
  supabase/server.ts
  supabase/admin.ts
supabase/
  migrations/0001_initial_schema.sql
middleware.ts or proxy.ts
```

## Core UX
The app has two main tabs:

1. Add Scores
2. Ladder

### Add Scores Tab
The score entry flow should be fast and hard to misuse:

- Select player 1 from a searchable dropdown.
- Select player 2 from a searchable dropdown.
- Prevent selecting the same player twice.
- Enter total rounds won by each player, for example `1-1`, `2-0`, `3-2`.
- Allow multiple rounds in one score submission.
- Include checkbox: `Under de tafel door`.
- If checked, require selecting which player received the medal.
- Save one match row plus one row per individual round.
- Show the rating change preview before submit.
- After submit, show rating deltas, medal awards, and current streak changes.

### Ladder Tab
The ladder should feel playful and premium:

- Show top 3 as a podium with gold, silver, and bronze styling.
- Show the rest as ranking cards.
- Each player card shows:
  - Rank
  - Name/avatar
  - Star rating from 1.0 to 5.0
  - Recent form, for example `W W L W`
  - Current winning streak
  - Medal count
- Add a player dropdown/search to inspect any colleague.
- Player detail view shows:
  - Medals earned
  - Rating history
  - Match history
  - Head-to-head record
  - Current streaks
  - Best streak

## Rating Model
Use a star-based Elo-style formula. Store rating as a numeric star value, not just a rendered label.

### Rating Constraints

- Minimum rating: `1.0`
- Maximum rating: `5.0`
- New players start at `1.0`
- The long-run active ladder should tend toward a center near `3.0`
- Initial movement should be faster so new players can climb out of 1 star
- Climbing above 3 should become progressively harder
- Climbing above 4 should be very difficult
- A draw between unequal players should help the lower-rated player and hurt the higher-rated player

### Match Score
If a submitted result is `p1_rounds = 1` and `p2_rounds = 1`, then:

```ts
actualP1 = 0.5;
actualP2 = 0.5;
```

For any result:

```ts
const totalRounds = p1Rounds + p2Rounds;
const actualP1 = p1Rounds / totalRounds;
const actualP2 = p2Rounds / totalRounds;
```

A `2-0` is stronger than a `1-0` because it has more round evidence, but cap the match impact so one long session cannot destroy the ladder.

### Expected Score
Use star difference directly:

```ts
const expectedP1 = 1 / (1 + Math.pow(10, (p2Stars - p1Stars) / 1.2));
const expectedP2 = 1 - expectedP1;
```

The `1.2` denominator controls sensitivity. Smaller means star differences matter more.

### K Factor
Use a dynamic K-factor:

```ts
const baseK = 0.32;
const roundMultiplier = Math.min(1.8, Math.sqrt(totalRounds));
const earlyMultiplier = playerGames < 10 ? 1.65 - playerGames * 0.065 : 1.0;
const topDampening = 1 - 0.55 * Math.max(0, (currentStars - 3) / 2) ** 2;
const k = baseK * roundMultiplier * earlyMultiplier * Math.max(0.35, topDampening);
```

This means:

- New players move faster.
- Multi-round results matter more than single games.
- Rating gains above 3 stars are dampened.
- Rating gains above 4 stars are strongly dampened.

### Rating Delta

```ts
const rawDelta = k * (actual - expected);
```

Apply a tiny center-of-mass correction so the ladder naturally stabilizes around 3.0 over time:

```ts
const distributionPressure = 0.015 * (3 - currentStars) * Math.min(1, playerGames / 20);
const nextStars = clamp(currentStars + rawDelta + distributionPressure, 1, 5);
```

Important: Apply distribution pressure gently. It should not feel like random drift, and it should never overpower match results.

### Draw Example
Player A: `4.0` stars
Player B: `2.0` stars
Result: `1-1`

Expected score for A is high. Actual score is only `0.5`, so A drops slightly and B climbs slightly. The bigger the star gap, the stronger this effect.

### Store Rating History
Every match must create rating history rows for both players. This allows debugging, charts, rollback, and future formula changes.

## Database Schema
Use Supabase migrations. Keep RLS strict.

Recommended schema:

```sql
create extension if not exists pgcrypto;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
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
  unique (auth_user_id),
  unique (display_name)
);

create table public.pool_matches (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
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

create table public.pool_rounds (
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

create table public.rating_events (
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

create table public.medals (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table public.player_medals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  medal_id uuid not null references public.medals(id) on delete cascade,
  match_id uuid references public.pool_matches(id) on delete set null,
  awarded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.medal_challenges (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pool_matches(id) on delete cascade,
  medal_key text not null,
  challenged_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index players_ladder_idx on public.players(active, stars desc, rounds_won desc);
create index pool_matches_played_at_idx on public.pool_matches(played_at desc);
create index pool_matches_player_one_idx on public.pool_matches(player_one_id, played_at desc);
create index pool_matches_player_two_idx on public.pool_matches(player_two_id, played_at desc);
create index rating_events_player_idx on public.rating_events(player_id, created_at desc);
create index player_medals_player_idx on public.player_medals(player_id, awarded_at desc);
```

### Seed Medals
Seed these medals in a migration or setup script:

```sql
insert into public.medals (key, name, description, icon) values
('winner_first_win', 'Winner!', 'Awarded for winning your first round.', 'trophy'),
('winning_streak_3', 'Winning Streak', 'Awarded for 3 consecutive round wins.', 'flame'),
('bloodthirsty_5', 'Bloodthirsty', 'Awarded for 5 consecutive round wins.', 'skull'),
('payback', 'Payback', 'Awarded for beating someone who beat you before.', 'rotate-ccw'),
('under_table', 'Onder de tafel door', 'Awarded when a player wins a round while the opponent pots zero balls.', 'badge-alert'),
('giant_slayer', 'Giant Slayer', 'Awarded for beating a player at least 1.5 stars higher.', 'sword'),
('clean_sweep', 'Clean Sweep', 'Awarded for winning a multi-round match without losing a round.', 'sparkles')
on conflict (key) do nothing;
```

## RLS Rules
Use authenticated reads for the office ladder, but restrict writes to authenticated users.

Recommended starting point:

```sql
alter table public.players enable row level security;
alter table public.pool_matches enable row level security;
alter table public.pool_rounds enable row level security;
alter table public.rating_events enable row level security;
alter table public.medals enable row level security;
alter table public.player_medals enable row level security;
alter table public.medal_challenges enable row level security;

create policy players_read on public.players for select to authenticated using (true);
create policy matches_read on public.pool_matches for select to authenticated using (true);
create policy rounds_read on public.pool_rounds for select to authenticated using (true);
create policy rating_events_read on public.rating_events for select to authenticated using (true);
create policy medals_read on public.medals for select to authenticated using (true);
create policy player_medals_read on public.player_medals for select to authenticated using (true);
create policy medal_challenges_read on public.medal_challenges for select to authenticated using (true);
```

For writes, prefer API route handlers using server-side Supabase clients. Avoid allowing clients to directly mutate ratings, matches, or medals, because rating updates must be transactional.

## API Design
Use route handlers as the authoritative mutation layer.

### POST `/api/pool/matches`
Input:

```ts
{
  playerOneId: string;
  playerTwoId: string;
  playerOneRounds: number;
  playerTwoRounds: number;
  playedAt?: string;
  underTablePlayerId?: string;
  notes?: string;
}
```

Server behavior:

1. Validate with Zod.
2. Load both players.
3. Calculate rating preview and final deltas.
4. Insert `pool_matches`.
5. Insert `pool_rounds`.
6. Insert `rating_events` for both players.
7. Update `players` aggregate fields.
8. Award medals.
9. Return updated ladder snippets and medal awards.

Use a database RPC or Supabase transaction pattern if available. If using multiple REST calls, make failures safe and avoid partial writes.

### GET `/api/pool/players`
Return players for dropdowns and ladder display.

### POST `/api/pool/medals/challenge`
Used to challenge an `Onder de tafel door` medal.

Input:

```ts
{
  matchId: string;
  reason?: string;
}
```

## Medal Rules
Medals should be calculated after each submitted match.

### Winner!
Award when a player wins their first round ever.

### Winning Streak
Award when current consecutive round wins reaches exactly 3.

### Bloodthirsty
Award when current consecutive round wins reaches exactly 5.

### Payback
Award when a player wins a match against someone who has beaten them in any previous match.

### Onder de tafel door
Award when the score submitter checks the special box and selects the winner of that round.

Important:

- The opponent can challenge this medal.
- Challenged medals should remain visible but marked as `challenged` or `pending` until resolved.
- If rejected, remove or visually strike the medal award.

### Extra Medal Ideas
Good optional medals:

- `Giant Slayer`: beat someone at least 1.5 stars above you.
- `Clean Sweep`: win a multi-round match without losing a round.
- `Comeback Kid`: win a match after losing the previous match against the same opponent.
- `Gatekeeper`: beat three different lower-rated players in a row.
- `Table Boss`: hold rank #1 for a week.
- `Ice Cold`: win a deciding final round in a tied session.

## Implementation Details

### Rating Function
Create `lib/pool/rating.ts` with pure functions:

```ts
export type RatingInput = {
  playerOneStars: number;
  playerTwoStars: number;
  playerOneGames: number;
  playerTwoGames: number;
  playerOneRounds: number;
  playerTwoRounds: number;
};

export type RatingResult = {
  playerOne: {
    expected: number;
    actual: number;
    before: number;
    after: number;
    delta: number;
  };
  playerTwo: {
    expected: number;
    actual: number;
    before: number;
    after: number;
    delta: number;
  };
};
```

Keep this file framework-independent and unit-testable.

### Ladder Sorting
Sort by:

1. Stars descending
2. Rounds won descending
3. Win percentage descending
4. Most recent win descending
5. Display name ascending

### Visual Direction
Do not make a plain admin table. Make it feel like a compact sports ladder:

- Dark green, felt-table-inspired background
- Brass/gold accents for rank and medals
- Top 3 podium cards with medal glow
- Player cards with compact stat chips
- Star rating rendered as a custom 1.0 to 5.0 meter
- Smooth but subtle animations for newly awarded medals
- Mobile first; desktop can show side-by-side ladder and player detail

## Testing Requirements
At minimum:

- Rating formula tests:
  - equal players 1-1 causes no meaningful change
  - high-rated player drawing low-rated player loses points
  - low-rated player drawing high-rated player gains points
  - 2-0 creates larger impact than 1-0, but capped
  - new player moves faster than experienced player
  - rating never drops below 1 or above 5
- Medal tests:
  - 3 consecutive round wins awards Winning Streak
  - 5 consecutive round wins awards Bloodthirsty
  - first win awards Winner!
  - payback only awards if prior loss exists
  - under-table challenge can be created
- API tests or manual smoke tests:
  - add match
  - add draw
  - add multi-round result
  - duplicate player validation
  - ladder updates immediately

## Environment Variables
Expected variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Use Vercel project environment variables in the same way as this repository. Do not expose service role keys to client components.

## Development Commands
Use the same project command conventions:

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Product Defaults
When a decision is needed, use these defaults:

- New users can view the ladder after login.
- Only authenticated users can submit scores.
- Any authenticated user can submit a match between any two players.
- Rating changes are visible immediately after submitting a score.
- Medals are public within the app.
- `Onder de tafel door` medals are challengeable by the opponent.
- Ratings are recalculable from match history, so keep all historical rating events.

## Important Build Notes For Codex
- Implement the schema before building UI that depends on it.
- Keep rating and medal logic in pure TypeScript modules.
- Keep mutation logic on the server.
- Do not let the client directly update player ratings.
- Make all score submissions idempotent where practical.
- Preserve a playful office vibe, but keep the score entry flow extremely fast.
- If the user asks for a similar app, copy the infrastructure pattern, not the Personal Trainer AI domain model.
