"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, PlusCircle } from "lucide-react";
import { AddScoreTab } from "@/components/pool/AddScoreTab";
import { LadderTab } from "@/components/pool/LadderTab";
import type { RankedPlayer } from "@/lib/pool/ladder";

type PlayersResponse = {
  players: RankedPlayer[];
  demoMode: boolean;
};

export function PoolWorkspace() {
  const [activeTab, setActiveTab] = useState<"score" | "ladder">("score");
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPlayers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pool/players", { cache: "no-store" });
      const payload = (await response.json()) as PlayersResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load players.");
      }

      setPlayers(payload.players);
      setDemoMode(payload.demoMode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load players.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlayers();
  }, []);

  const selectedPlayer = useMemo(() => players[0], [players]);

  return (
    <section className="flex flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 rounded-[20px] border border-brand-ink/10 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("score")}
          className={`focus-ring flex h-11 items-center justify-center gap-2 rounded-[16px] px-3 text-sm font-black transition ${
            activeTab === "score" ? "bg-brand-orange text-white shadow-glow" : "text-brand-ink hover:bg-brand-blush/70"
          }`}
        >
          <PlusCircle size={17} aria-hidden="true" />
          Add Scores
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ladder")}
          className={`focus-ring flex h-11 items-center justify-center gap-2 rounded-[16px] px-3 text-sm font-black transition ${
            activeTab === "ladder" ? "bg-brand-orange text-white shadow-glow" : "text-brand-ink hover:bg-brand-blush/70"
          }`}
        >
          <BarChart3 size={17} aria-hidden="true" />
          Ladder
        </button>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <div className={activeTab === "score" ? "grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]" : "grid gap-5"}>
        <div className="min-w-0">
        {activeTab === "score" ? (
          <AddScoreTab
            loading={loading}
            players={players}
            onPlayersChanged={(nextPlayers, nextDemoMode) => {
              setPlayers(nextPlayers);
              if (typeof nextDemoMode === "boolean") setDemoMode(nextDemoMode);
            }}
            onSubmitted={(nextPlayers) => {
              setPlayers(nextPlayers);
              setActiveTab("ladder");
            }}
          />
        ) : (
          <LadderTab loading={loading} players={players} selectedPlayerId={selectedPlayer?.id} />
        )}
        </div>

        {activeTab === "score" ? (
          <div className="hidden min-w-0 lg:block">
            <LadderTab loading={loading} players={players} selectedPlayerId={selectedPlayer?.id} compact={false} />
          </div>
        ) : null}
      </div>

      <div className="rounded-[18px] border border-brand-ink/10 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-black text-brand-ink">House Rules</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-ink/70">
          <li>Foul = ball-in-hand. Pocketing the cue ball or not hitting your own ball first means your opponent can place the white ball anywhere.</li>
          <li>Break doesn&apos;t decide ball type. If a ball goes in on the break, the table is still open — you must pocket one after to claim solids or stripes.</li>
          <li>Free choice on the 8-ball pocket. We don&apos;t play opposite-pocket rules — you can call any hole for the final black ball.</li>
          <li>When you pot the 8-ball on the break, you win the game.</li>
          <li>At the start of the game, agree on  &apos;calling the ball & corner&apos;. When you play with calling, missing the corner (even when it ends up down a different corner) is considered a foul.</li>
        </ol>
      </div>

      {demoMode ? (
        <div className="fixed bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-brand-orange/20 bg-white px-3 py-1.5 text-xs font-black text-brand-orange shadow-2xl">
          Demo data
        </div>
      ) : null}
    </section>
  );
}
