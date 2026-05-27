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
    <section
      className={`grid flex-1 gap-5 ${
        activeTab === "score" ? "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]" : "lg:grid-cols-1"
      }`}
    >
      <div className="min-w-0">
        <div className="mb-4 grid grid-cols-2 rounded-lg border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("score")}
            className={`focus-ring flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition ${
              activeTab === "score" ? "bg-brass-400 text-felt-950" : "text-white/70 hover:text-white"
            }`}
          >
            <PlusCircle size={17} aria-hidden="true" />
            Add Scores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ladder")}
            className={`focus-ring flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition ${
              activeTab === "ladder" ? "bg-brass-400 text-felt-950" : "text-white/70 hover:text-white"
            }`}
          >
            <BarChart3 size={17} aria-hidden="true" />
            Ladder
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-100">{error}</div>
        ) : null}

        {activeTab === "score" ? (
          <AddScoreTab
            loading={loading}
            players={players}
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

      {demoMode ? (
        <div className="fixed bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-brass-400/30 bg-felt-950/90 px-3 py-1.5 text-xs font-semibold text-brass-400 shadow-2xl backdrop-blur">
          Demo data
        </div>
      ) : null}
    </section>
  );
}
