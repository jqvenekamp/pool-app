"use client";

import { Chrome, LogIn } from "lucide-react";
import { hasSupabasePublicEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function LoginPanel() {
  const canLogin = hasSupabasePublicEnv();

  async function signIn() {
    if (!canLogin) return;

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/pool`,
      },
    });
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
      <div className="mb-6 grid size-12 place-items-center rounded-lg bg-brass-400/15 text-brass-400">
        <LogIn size={22} aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-white">Sign in to the ladder</h1>
      <p className="mt-2 text-sm leading-6 text-white/68">
        Use your workplace Google account to submit scores and challenge medals.
      </p>
      <button
        type="button"
        onClick={signIn}
        disabled={!canLogin}
        className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brass-400 px-4 py-3 text-sm font-bold text-felt-950 transition hover:bg-brass-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Chrome size={18} aria-hidden="true" />
        Continue with Google
      </button>
      {!canLogin ? (
        <p className="mt-4 text-xs leading-5 text-white/55">
          Supabase env vars are not configured yet, so auth is disabled locally.
        </p>
      ) : null}
    </section>
  );
}
