"use client";

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
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-12 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Search colleague</option>
        {players.map((player) => (
          <option key={player.id} value={player.id} disabled={player.id === blockedPlayerId}>
            #{player.rank} {player.display_name} - {player.stars.toFixed(2)} stars
          </option>
        ))}
      </select>
    </label>
  );
}
