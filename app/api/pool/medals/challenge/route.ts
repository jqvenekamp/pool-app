import { NextResponse } from "next/server";
import { z } from "zod";
import { createUnderTableChallenge } from "@/lib/pool/medals";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv, hasSupabasePublicEnv } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  if (!hasSupabaseAdminEnv() || !hasSupabasePublicEnv()) {
    return NextResponse.json({
      challenge: createUnderTableChallenge(parsed.data.matchId, parsed.data.reason),
      demoMode: true,
    });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You need to be signed in to challenge a medal." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("medal_challenges")
    .insert({
      ...createUnderTableChallenge(parsed.data.matchId, parsed.data.reason),
      challenged_by: user.id,
    })
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
