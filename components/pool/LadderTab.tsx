"use client";

import { useMemo, useState } from "react";
import { Flame, Medal, Search, Trophy } from "lucide-react";
import { PlayerMedalDrawer } from "@/components/pool/PlayerMedalDrawer";
import { StarMeter } from "@/components/pool/StarMeter";
import { TopThreePodium } from "@/components/pool/TopThreePodium";
import { recentFormLabel, type RankedPlayer } from "@/lib/pool/ladder";

export function LadderTab({
  loading,
  players,
  selectedPlayerId,
  compact = true,
}: {
  loading: boolean;
  players: RankedPlayer[];
  selectedPlayerId?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [inspectedId, setInspectedId] = useState(selectedPlayerId ?? "");

  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return players;

    return players.filter((player) => player.display_name.toLowerCase().includes(normalized));
  }, [players, query]);

  const inspectedPlayer = players.find((player) => player.id === inspectedId) ?? players[0];

  if (loading) {
    return <div className="rounded-[24px] border border-brand-ink/10 bg-white p-5 text-sm font-bold text-brand-ink/60">Loading ladder...</div>;
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[24px] border border-brand-ink/10 bg-white p-4 shadow-xl shadow-brand-ink/5 sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-brand-ink">Ladder</h2>
            <p className="mt-1 text-sm font-semibold text-brand-ink/60">Ranked by stars, rounds, percentage, and recent wins.</p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-[18px] bg-brand-orange/10 text-brand-orange">
            <Trophy size={20} aria-hidden="true" />
          </div>
        </div>

        {players.length > 0 ? <TopThreePodium players={players} /> : null}

        <label className="mt-5 grid gap-1.5">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-ink/50">Inspect player</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/35" size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ladder"
              className="focus-ring h-11 w-full rounded-[16px] border border-brand-ink/10 bg-brand-paper pl-10 pr-3 text-sm font-bold text-brand-ink placeholder:text-brand-ink/35"
            />
          </div>
        </label>

        <div className="mt-4 grid gap-2">
          {filteredPlayers.slice(3).map((player) => (
            <PlayerCard key={player.id} player={player} selected={player.id === inspectedPlayer?.id} onClick={() => setInspectedId(player.id)} />
          ))}
          {filteredPlayers.length <= 3
            ? filteredPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} selected={player.id === inspectedPlayer?.id} onClick={() => setInspectedId(player.id)} />
              ))
            : null}
        </div>
      </section>

      {compact ? <PlayerMedalDrawer player={inspectedPlayer} /> : null}
    </div>
  );
}

function PlayerCard({ player, selected, onClick }: { player: RankedPlayer; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring w-full rounded-[20px] border p-3 text-left transition ${
        selected ? "border-brand-orange/40 bg-brand-orange/10" : "border-brand-ink/10 bg-white hover:bg-brand-blush/45"
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <div className="grid size-10 place-items-center rounded-[16px] bg-brand-ink text-sm font-black text-white">#{player.rank}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-black text-brand-ink">{player.display_name}</h3>
            <span className="rounded-full bg-brand-ink/[0.08] px-2 py-0.5 text-[11px] font-bold text-brand-ink/60">{recentFormLabel(player.recent_form)}</span>
          </div>
          <div className="mt-2 max-w-56">
            <StarMeter value={player.stars} />
          </div>
        </div>
        <div className="grid gap-1 text-right">
          <span className="inline-flex items-center justify-end gap-1 text-xs font-bold text-brand-ink/65">
            <Flame size={13} aria-hidden="true" />
            {player.current_win_streak}
          </span>
          <span className="inline-flex items-center justify-end gap-1 text-xs font-bold text-brand-orange">
            <Medal size={13} aria-hidden="true" />
            {player.medal_count ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}
