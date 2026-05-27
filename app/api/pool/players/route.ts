import { NextResponse } from "next/server";
import { demoPlayers } from "@/lib/pool/demo";
import { sortLadder } from "@/lib/pool/ladder";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      players: sortLadder(demoPlayers),
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
      players: sortLadder(demoPlayers),
      demoMode: true,
    });
  }

  return NextResponse.json({
    players: sortLadder(
      (data ?? []).map((player) => ({
        ...player,
        stars: Number(player.stars),
        recent_form: [],
        medal_count: 0,
        last_win_at: null,
      })),
    ),
    demoMode: false,
  });
}
