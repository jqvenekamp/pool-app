import { NextResponse } from "next/server";
import { z } from "zod";
import { demoMatches, demoPlayers } from "@/lib/pool/demo";
import { enrichPlayersWithHeadToHead, type MatchRecord } from "@/lib/pool/head-to-head";
import { sortLadder, type LadderPlayer } from "@/lib/pool/ladder";
import { evaluateMedalAwards, type MedalAward } from "@/lib/pool/medals";
import { calculateRating, FORMULA_VERSION } from "@/lib/pool/rating";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";

const MatchSchema = z
  .object({
    playerOneId: z.string().uuid(),
    playerTwoId: z.string().uuid(),
    playerOneRounds: z.number().int().min(0).max(25),
    playerTwoRounds: z.number().int().min(0).max(25),
    playedAt: z.string().datetime().optional(),
    underTablePlayerId: z.string().uuid().optional().nullable(),
    notes: z.string().max(500).optional(),
  })
  .refine((value) => value.playerOneId !== value.playerTwoId, {
    message: "Choose two different players.",
    path: ["playerTwoId"],
  })
  .refine((value) => value.playerOneRounds + value.playerTwoRounds > 0, {
    message: "A match needs at least one round.",
    path: ["playerOneRounds"],
  })
  .refine(
    (value) =>
      !value.underTablePlayerId ||
      value.underTablePlayerId === value.playerOneId ||
      value.underTablePlayerId === value.playerTwoId,
    {
      message: "Under de tafel door must belong to one of the match players.",
      path: ["underTablePlayerId"],
    },
  );

type PlayerRow = LadderPlayer & {
  auth_user_id?: string | null;
};

export async function POST(request: Request) {
  const parsed = MatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(simulateMatch(parsed.data, demoPlayers, demoMatches, true));
  }

  if (process.env.NODE_ENV !== "production" && isDemoMatch(parsed.data.playerOneId, parsed.data.playerTwoId)) {
    return NextResponse.json(simulateMatch(parsed.data, demoPlayers, demoMatches, true));
  }

  const admin = createAdminClient();
  const { data: players, error: playerError } = await admin
    .from("players")
    .select("id, display_name, avatar_url, active, stars, games_played, rounds_won, rounds_lost, current_win_streak, best_win_streak")
    .in("id", [parsed.data.playerOneId, parsed.data.playerTwoId]);

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  const playerOne = players?.find((player) => player.id === parsed.data.playerOneId) as PlayerRow | undefined;
  const playerTwo = players?.find((player) => player.id === parsed.data.playerTwoId) as PlayerRow | undefined;

  if (!playerOne || !playerTwo) {
    return NextResponse.json({ error: "Could not find both players." }, { status: 404 });
  }

  const rating = calculateRating({
    playerOneStars: Number(playerOne.stars),
    playerTwoStars: Number(playerTwo.stars),
    playerOneGames: playerOne.games_played,
    playerTwoGames: playerTwo.games_played,
    playerOneRounds: parsed.data.playerOneRounds,
    playerTwoRounds: parsed.data.playerTwoRounds,
  });

  const { data: match, error: matchError } = await admin
    .from("pool_matches")
    .insert({
      player_one_id: parsed.data.playerOneId,
      player_two_id: parsed.data.playerTwoId,
      player_one_rounds: parsed.data.playerOneRounds,
      player_two_rounds: parsed.data.playerTwoRounds,
      played_at: parsed.data.playedAt ?? new Date().toISOString(),
      notes: parsed.data.notes || null,
      under_table_player_id: parsed.data.underTablePlayerId ?? null,
      under_table_challenge_status: parsed.data.underTablePlayerId ? "pending" : "none",
      metadata: { formulaVersion: FORMULA_VERSION },
    })
    .select()
    .single();

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  const roundRows = buildRoundRows({
    matchId: match.id,
    playerOneId: parsed.data.playerOneId,
    playerTwoId: parsed.data.playerTwoId,
    playerOneRounds: parsed.data.playerOneRounds,
    playerTwoRounds: parsed.data.playerTwoRounds,
    underTablePlayerId: parsed.data.underTablePlayerId ?? null,
  });

  const { error: roundsError } = await admin.from("pool_rounds").insert(roundRows);
  if (roundsError) {
    return NextResponse.json({ error: roundsError.message }, { status: 500 });
  }

  const streaks = nextStreaks(playerOne, playerTwo, parsed.data.playerOneRounds, parsed.data.playerTwoRounds);

  const { error: ratingError } = await admin.from("rating_events").insert([
    {
      match_id: match.id,
      player_id: playerOne.id,
      opponent_id: playerTwo.id,
      stars_before: rating.playerOne.before,
      stars_after: rating.playerOne.after,
      delta: rating.playerOne.delta,
      expected_score: rating.playerOne.expected,
      actual_score: rating.playerOne.actual,
      formula_version: FORMULA_VERSION,
    },
    {
      match_id: match.id,
      player_id: playerTwo.id,
      opponent_id: playerOne.id,
      stars_before: rating.playerTwo.before,
      stars_after: rating.playerTwo.after,
      delta: rating.playerTwo.delta,
      expected_score: rating.playerTwo.expected,
      actual_score: rating.playerTwo.actual,
      formula_version: FORMULA_VERSION,
    },
  ]);

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 500 });
  }

  const [priorLossOne, priorLossTwo] = await Promise.all([
    hadPriorLoss(admin, playerOne.id, playerTwo.id),
    hadPriorLoss(admin, playerTwo.id, playerOne.id),
  ]);

  const medalAwards = evaluateMedalAwards({
    playerOne: {
      id: playerOne.id,
      stars: Number(playerOne.stars),
      roundsWonBefore: playerOne.rounds_won,
      currentWinStreakBefore: playerOne.current_win_streak,
      currentWinStreakAfter: streaks.playerOne.current,
      matchRoundsWon: parsed.data.playerOneRounds,
      matchRoundsLost: parsed.data.playerTwoRounds,
      priorLossToOpponent: priorLossOne,
    },
    playerTwo: {
      id: playerTwo.id,
      stars: Number(playerTwo.stars),
      roundsWonBefore: playerTwo.rounds_won,
      currentWinStreakBefore: playerTwo.current_win_streak,
      currentWinStreakAfter: streaks.playerTwo.current,
      matchRoundsWon: parsed.data.playerTwoRounds,
      matchRoundsLost: parsed.data.playerOneRounds,
      priorLossToOpponent: priorLossTwo,
    },
    underTablePlayerId: parsed.data.underTablePlayerId,
  });

  const { error: updateOneError } = await admin
    .from("players")
    .update({
      stars: rating.playerOne.after,
      games_played: playerOne.games_played + 1,
      rounds_won: playerOne.rounds_won + parsed.data.playerOneRounds,
      rounds_lost: playerOne.rounds_lost + parsed.data.playerTwoRounds,
      current_win_streak: streaks.playerOne.current,
      best_win_streak: streaks.playerOne.best,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerOne.id);

  const { error: updateTwoError } = await admin
    .from("players")
    .update({
      stars: rating.playerTwo.after,
      games_played: playerTwo.games_played + 1,
      rounds_won: playerTwo.rounds_won + parsed.data.playerTwoRounds,
      rounds_lost: playerTwo.rounds_lost + parsed.data.playerOneRounds,
      current_win_streak: streaks.playerTwo.current,
      best_win_streak: streaks.playerTwo.best,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerTwo.id);

  if (updateOneError || updateTwoError) {
    return NextResponse.json({ error: updateOneError?.message ?? updateTwoError?.message }, { status: 500 });
  }

  await insertMedalAwards(admin, medalAwards, match.id);

  const { data: allPlayers } = await admin
    .from("players")
    .select("id, display_name, avatar_url, active, stars, games_played, rounds_won, rounds_lost, current_win_streak, best_win_streak")
    .eq("active", true);
  const { data: allMatches } = await admin
    .from("pool_matches")
    .select("id, player_one_id, player_two_id, player_one_rounds, player_two_rounds, played_at")
    .order("played_at", { ascending: true });
  const { data: allMedals } = await admin.from("player_medals").select("player_id");
  const medalCounts = new Map<string, number>();

  for (const medal of allMedals ?? []) {
    medalCounts.set(medal.player_id, (medalCounts.get(medal.player_id) ?? 0) + 1);
  }

  const ladderPlayers = (allPlayers ?? []).map((player) => ({
    ...player,
    stars: Number(player.stars),
    recent_form: recentFormForPlayer(player.id, allMatches ?? []),
    medal_count: medalCounts.get(player.id) ?? 0,
    last_win_at: lastWinForPlayer(player.id, allMatches ?? []),
  }));

  return NextResponse.json({
    match,
    rating,
    medalAwards,
    streaks,
    ladder: sortLadder(enrichPlayersWithHeadToHead(ladderPlayers, allMatches ?? [])),
    demoMode: false,
  });
}

function isDemoMatch(playerOneId: string, playerTwoId: string) {
  const demoIds = new Set(demoPlayers.map((player) => player.id));
  return demoIds.has(playerOneId) && demoIds.has(playerTwoId);
}

function simulateMatch(input: z.infer<typeof MatchSchema>, players: LadderPlayer[], matches: MatchRecord[], demoMode: boolean) {
  const playerOne = players.find((player) => player.id === input.playerOneId);
  const playerTwo = players.find((player) => player.id === input.playerTwoId);

  if (!playerOne || !playerTwo) {
    return { error: "Could not find both players.", demoMode };
  }

  const rating = calculateRating({
    playerOneStars: playerOne.stars,
    playerTwoStars: playerTwo.stars,
    playerOneGames: playerOne.games_played,
    playerTwoGames: playerTwo.games_played,
    playerOneRounds: input.playerOneRounds,
    playerTwoRounds: input.playerTwoRounds,
  });
  const streaks = nextStreaks(playerOne, playerTwo, input.playerOneRounds, input.playerTwoRounds);
  const medalAwards = evaluateMedalAwards({
    playerOne: {
      id: playerOne.id,
      stars: playerOne.stars,
      roundsWonBefore: playerOne.rounds_won,
      currentWinStreakBefore: playerOne.current_win_streak,
      currentWinStreakAfter: streaks.playerOne.current,
      matchRoundsWon: input.playerOneRounds,
      matchRoundsLost: input.playerTwoRounds,
      priorLossToOpponent: input.playerOneRounds > input.playerTwoRounds && playerOne.stars < playerTwo.stars,
    },
    playerTwo: {
      id: playerTwo.id,
      stars: playerTwo.stars,
      roundsWonBefore: playerTwo.rounds_won,
      currentWinStreakBefore: playerTwo.current_win_streak,
      currentWinStreakAfter: streaks.playerTwo.current,
      matchRoundsWon: input.playerTwoRounds,
      matchRoundsLost: input.playerOneRounds,
      priorLossToOpponent: input.playerTwoRounds > input.playerOneRounds && playerTwo.stars < playerOne.stars,
    },
    underTablePlayerId: input.underTablePlayerId,
  });

  const nextPlayers = players.map((player) => {
    if (player.id === playerOne.id) {
      return toUpdatedPlayer(playerOne, rating.playerOne.after, input.playerOneRounds, input.playerTwoRounds, streaks.playerOne);
    }

    if (player.id === playerTwo.id) {
      return toUpdatedPlayer(playerTwo, rating.playerTwo.after, input.playerTwoRounds, input.playerOneRounds, streaks.playerTwo);
    }

    return player;
  });

  const nextMatch: MatchRecord = {
    id: crypto.randomUUID(),
    player_one_id: input.playerOneId,
    player_two_id: input.playerTwoId,
    player_one_rounds: input.playerOneRounds,
    player_two_rounds: input.playerTwoRounds,
    played_at: new Date().toISOString(),
  };

  return {
    match: {
      id: nextMatch.id,
      player_one_id: nextMatch.player_one_id,
      player_two_id: nextMatch.player_two_id,
      player_one_rounds: nextMatch.player_one_rounds,
      player_two_rounds: nextMatch.player_two_rounds,
    },
    rating,
    medalAwards,
    streaks,
    ladder: sortLadder(enrichPlayersWithHeadToHead(nextPlayers, [...matches, nextMatch])),
    demoMode,
  };
}

function buildRoundRows(input: {
  matchId: string;
  playerOneId: string;
  playerTwoId: string;
  playerOneRounds: number;
  playerTwoRounds: number;
  underTablePlayerId: string | null;
}) {
  const rows: {
    match_id: string;
    round_number: number;
    winner_id: string;
    loser_id: string;
    under_table: boolean;
  }[] = [];
  let roundNumber = 1;
  let underTableMarked = false;

  for (let i = 0; i < input.playerOneRounds; i += 1) {
    const underTable: boolean = input.underTablePlayerId === input.playerOneId && !underTableMarked;
    rows.push({
      match_id: input.matchId,
      round_number: roundNumber,
      winner_id: input.playerOneId,
      loser_id: input.playerTwoId,
      under_table: underTable,
    });
    underTableMarked ||= underTable;
    roundNumber += 1;
  }

  for (let i = 0; i < input.playerTwoRounds; i += 1) {
    const underTable: boolean = input.underTablePlayerId === input.playerTwoId && !underTableMarked;
    rows.push({
      match_id: input.matchId,
      round_number: roundNumber,
      winner_id: input.playerTwoId,
      loser_id: input.playerOneId,
      under_table: underTable,
    });
    underTableMarked ||= underTable;
    roundNumber += 1;
  }

  return rows;
}

function nextStreaks(playerOne: LadderPlayer, playerTwo: LadderPlayer, playerOneRounds: number, playerTwoRounds: number) {
  if (playerOneRounds === playerTwoRounds) {
    return {
      playerOne: { current: 0, best: playerOne.best_win_streak },
      playerTwo: { current: 0, best: playerTwo.best_win_streak },
    };
  }

  const playerOneCurrent = playerOneRounds > playerTwoRounds ? playerOne.current_win_streak + playerOneRounds : 0;
  const playerTwoCurrent = playerTwoRounds > playerOneRounds ? playerTwo.current_win_streak + playerTwoRounds : 0;

  return {
    playerOne: { current: playerOneCurrent, best: Math.max(playerOne.best_win_streak, playerOneCurrent) },
    playerTwo: { current: playerTwoCurrent, best: Math.max(playerTwo.best_win_streak, playerTwoCurrent) },
  };
}

function toUpdatedPlayer(
  player: LadderPlayer,
  stars: number,
  roundsWon: number,
  roundsLost: number,
  streak: { current: number; best: number },
): LadderPlayer {
  return {
    ...player,
    stars,
    games_played: player.games_played + 1,
    rounds_won: player.rounds_won + roundsWon,
    rounds_lost: player.rounds_lost + roundsLost,
    current_win_streak: streak.current,
    best_win_streak: streak.best,
    recent_form: [roundsWon > roundsLost ? "W" : roundsWon === roundsLost ? "D" : "L", ...(player.recent_form ?? [])].slice(0, 5),
    last_win_at: roundsWon > roundsLost ? new Date().toISOString() : player.last_win_at,
  };
}

async function hadPriorLoss(admin: ReturnType<typeof createAdminClient>, playerId: string, opponentId: string) {
  const { data, error } = await admin
    .from("pool_matches")
    .select("id")
    .or(
      `and(player_one_id.eq.${playerId},player_two_id.eq.${opponentId},player_one_rounds.lt.player_two_rounds),and(player_one_id.eq.${opponentId},player_two_id.eq.${playerId},player_two_rounds.lt.player_one_rounds)`,
    )
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

async function insertMedalAwards(admin: ReturnType<typeof createAdminClient>, awards: MedalAward[], matchId: string) {
  if (awards.length === 0) return;

  const { data: medals } = await admin.from("medals").select("id, key").in(
    "key",
    awards.map((award) => award.medalKey),
  );

  const rows: {
    player_id: string;
    medal_id: string;
    match_id: string;
    metadata: Record<string, unknown>;
  }[] = awards
    .map((award) => {
      const medal = medals?.find((item) => item.key === award.medalKey);
      if (!medal) return null;

      return {
        player_id: award.playerId,
        medal_id: medal.id,
        match_id: matchId,
        metadata: award.metadata ?? {},
      };
    })
    .filter((row): row is { player_id: string; medal_id: string; match_id: string; metadata: Record<string, unknown> } =>
      Boolean(row),
    );

  if (rows.length > 0) {
    await admin.from("player_medals").insert(rows);
  }
}

function recentFormForPlayer(playerId: string, matches: MatchRecord[]) {
  return [...matches]
    .filter((match) => match.player_one_id === playerId || match.player_two_id === playerId)
    .sort((a, b) => Date.parse(b.played_at ?? "") - Date.parse(a.played_at ?? ""))
    .slice(0, 5)
    .map((match) => {
      const isPlayerOne = match.player_one_id === playerId;
      const roundsFor = isPlayerOne ? match.player_one_rounds : match.player_two_rounds;
      const roundsAgainst = isPlayerOne ? match.player_two_rounds : match.player_one_rounds;
      if (roundsFor > roundsAgainst) return "W";
      if (roundsFor < roundsAgainst) return "L";
      return "D";
    });
}

function lastWinForPlayer(playerId: string, matches: MatchRecord[]) {
  const win = [...matches]
    .filter((match) => {
      if (match.player_one_id === playerId) return match.player_one_rounds > match.player_two_rounds;
      if (match.player_two_id === playerId) return match.player_two_rounds > match.player_one_rounds;
      return false;
    })
    .sort((a, b) => Date.parse(b.played_at ?? "") - Date.parse(a.played_at ?? ""))
    .at(0);

  return win?.played_at ?? null;
}
