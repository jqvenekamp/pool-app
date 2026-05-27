"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { RankedPlayer } from "@/lib/pool/ladder";

export function PlayerSelect({
  label,
  value,
  onChange,
  disabled,
  players,
  blockedPlayerId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  players: RankedPlayer[];
  blockedPlayerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedPlayer = players.find((player) => player.id === value);
  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return players.filter((player) => {
      if (player.id === blockedPlayerId) return false;
      if (!normalized) return true;
      return player.display_name.toLowerCase().includes(normalized);
    });
  }, [blockedPlayerId, players, query]);

  return (
    <div className="relative grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-ink/50">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="focus-ring flex h-12 w-full items-center justify-between gap-3 rounded-[16px] border border-brand-ink/10 bg-white px-3 text-left text-sm font-black text-brand-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedPlayer ? "truncate" : "truncate text-brand-ink/40"}>
          {selectedPlayer ? `${selectedPlayer.display_name} - ${selectedPlayer.stars.toFixed(2)} stars` : "Choose player"}
        </span>
        <ChevronDown className={`shrink-0 text-brand-orange transition ${open ? "rotate-180" : ""}`} size={18} aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[4.7rem] z-30 overflow-hidden rounded-[18px] border border-brand-ink/10 bg-white shadow-2xl">
          <div className="relative border-b border-brand-ink/10">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/35" size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search colleague"
              className="h-11 w-full bg-brand-paper pl-9 pr-3 text-sm font-bold text-brand-ink outline-none placeholder:text-brand-ink/35"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <button
                  type="button"
                  key={player.id}
                  onClick={() => {
                    onChange(player.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm font-black text-brand-ink transition hover:bg-brand-blush/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{player.display_name}</span>
                    <span className="block text-xs font-bold text-brand-ink/45">
                      #{player.rank} · {player.stars.toFixed(2)} stars
                    </span>
                  </span>
                  {value === player.id ? <Check className="shrink-0 text-brand-orange" size={16} aria-hidden="true" /> : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm font-bold text-brand-ink/50">No player found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
