"use client";

import { Flame, History, Swords, Trophy } from "lucide-react";
import { MedalBadge } from "@/components/pool/MedalBadge";
import { StarMeter } from "@/components/pool/StarMeter";
import type { RankedPlayer } from "@/lib/pool/ladder";

export function PlayerMedalDrawer({ player }: { player?: RankedPlayer }) {
  if (!player) {
    return (
      <aside className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/55">
        Pick a player to inspect streaks, medals, and rivalries.
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-lg bg-brass-400/15 text-lg font-black text-brass-400">
          {player.display_name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brass-400">#{player.rank}</p>
          <h3 className="truncate text-lg font-black text-white">{player.display_name}</h3>
        </div>
      </div>
      <StarMeter value={player.stars} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <DetailChip icon={<Flame size={15} aria-hidden="true" />} label="Streak" value={String(player.current_win_streak)} />
        <DetailChip icon={<Trophy size={15} aria-hidden="true" />} label="Best" value={String(player.best_win_streak)} />
        <DetailChip icon={<History size={15} aria-hidden="true" />} label="Games" value={String(player.games_played)} />
        <DetailChip icon={<Swords size={15} aria-hidden="true" />} label="Rounds" value={`${player.rounds_won}-${player.rounds_lost}`} />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45">Medals</p>
        <div className="flex flex-wrap gap-2">
          <MedalBadge medalKey="winner_first_win" count={Math.min(1, player.medal_count ?? 0)} />
          {(player.medal_count ?? 0) > 2 ? <MedalBadge medalKey="winning_streak_3" /> : null}
          {(player.medal_count ?? 0) > 4 ? <MedalBadge medalKey="giant_slayer" /> : null}
        </div>
      </div>
    </aside>
  );
}

function DetailChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-white/45">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="text-base font-black text-white">{value}</p>
    </div>
  );
}
