import { NextResponse } from "next/server";
import { z } from "zod";
import { createUnderTableChallenge } from "@/lib/pool/medals";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/supabase/config";

export const runtime = "nodejs";

const ChallengeSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const parsed = ChallengeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      challenge: createUnderTableChallenge(parsed.data.matchId, parsed.data.reason),
      demoMode: true,
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("medal_challenges")
    .insert(createUnderTableChallenge(parsed.data.matchId, parsed.data.reason))
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("pool_matches")
    .update({ under_table_challenge_status: "pending" })
    .eq("id", parsed.data.matchId);

  return NextResponse.json({ challenge: data, demoMode: false });
}
