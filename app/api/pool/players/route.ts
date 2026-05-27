import { NextResponse } from "next/server";
import { z } from "zod";
import { demoMatches, demoPlayers } from "@/lib/pool/demo";
import { enrichPlayersWithHeadToHead } from "@/lib/pool/head-to-head";
import { sortLadder } from "@/lib/pool/ladder";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";

const AddPlayerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Use at least two letters.")
    .max(60, "Keep names under 60 characters."),
});

export async function GET() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      players: sortLadder(enrichPlayersWithHeadToHead(demoPlayers, demoMatches)),
      demoMode: true,
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("players")
    .select(
      "id, display_name, avatar_url, active, stars, games_played, rounds_won, rounds_lost, current_win_streak, best_win_streak",
    )
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data?.length ?? 0) === 0 && process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      players: sortLadder(enrichPlayersWithHeadToHead(demoPlayers, demoMatches)),
      demoMode: true,
    });
  }

  const players = (data ?? []).map((player) => ({
    ...player,
    stars: Number(player.stars),
    recent_form: [] as string[],
    medal_count: 0,
    last_win_at: null,
  }));
  const { data: matches } = await supabase
    .from("pool_matches")
    .select("id, player_one_id, player_two_id, player_one_rounds, player_two_rounds, played_at")
    .order("played_at", { ascending: true });
  const { data: medals } = await supabase.from("player_medals").select("player_id");
  const medalCounts = new Map<string, number>();

  for (const medal of medals ?? []) {
    medalCounts.set(medal.player_id, (medalCounts.get(medal.player_id) ?? 0) + 1);
  }

  return NextResponse.json({
    players: sortLadder(enrichPlayersWithHeadToHead(players, matches ?? []).map((player) => ({
      ...player,
      medal_count: medalCounts.get(player.id) ?? 0,
      recent_form: recentFormForPlayer(player.id, matches ?? []),
      last_win_at: lastWinForPlayer(player.id, matches ?? []),
    }))),
    demoMode: false,
  });
}

export async function POST(request: Request) {
  const parsed = AddPlayerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const displayName = parsed.data.displayName.replace(/\s+/g, " ");

  if (!hasSupabaseAdminEnv()) {
    if (demoPlayers.some((player) => player.display_name.toLowerCase() === displayName.toLowerCase())) {
      return NextResponse.json({ error: "That player is already on the ladder." }, { status: 409 });
    }

    const newPlayer = {
      id: crypto.randomUUID(),
      display_name: displayName,
      avatar_url: null,
      active: true,
      stars: 1,
      games_played: 0,
      rounds_won: 0,
      rounds_lost: 0,
      current_win_streak: 0,
      best_win_streak: 0,
      recent_form: [],
      medal_count: 0,
      last_win_at: null,
      head_to_head: [],
    };

    return NextResponse.json({
      player: newPlayer,
      players: sortLadder([...enrichPlayersWithHeadToHead(demoPlayers, demoMatches), newPlayer]),
      demoMode: true,
    });
  }

  const supabase = createAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("players")
    .select("id")
    .ilike("display_name", displayName)
    .limit(1);

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  if ((existing?.length ?? 0) > 0) {
    return NextResponse.json({ error: "That player is already on the ladder." }, { status: 409 });
  }

  const { error: insertError } = await supabase.from("players").insert({ display_name: displayName });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return GET();
}

function recentFormForPlayer(
  playerId: string,
  matches: {
    player_one_id: string;
    player_two_id: string;
    player_one_rounds: number;
    player_two_rounds: number;
    played_at?: string | null;
  }[],
) {
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

function lastWinForPlayer(
  playerId: string,
  matches: {
    player_one_id: string;
    player_two_id: string;
    player_one_rounds: number;
    player_two_rounds: number;
    played_at?: string | null;
  }[],
) {
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
