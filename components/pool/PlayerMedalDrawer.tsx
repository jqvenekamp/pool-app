"use client";

import { Flame, History, Swords, Trophy } from "lucide-react";
import { MedalBadge } from "@/components/pool/MedalBadge";
import { StarMeter } from "@/components/pool/StarMeter";
import type { RankedPlayer } from "@/lib/pool/ladder";

export function PlayerMedalDrawer({ player }: { player?: RankedPlayer }) {
  if (!player) {
    return (
      <aside className="rounded-[24px] border border-brand-ink/10 bg-white p-4 text-sm font-bold text-brand-ink/55 shadow-xl shadow-brand-ink/5">
        Pick a player to inspect streaks, medals, and rivalries.
      </aside>
    );
  }

  return (
    <aside className="rounded-[24px] border border-brand-ink/10 bg-white p-4 shadow-xl shadow-brand-ink/5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-[18px] bg-brand-orange text-lg font-black text-white">
          {player.display_name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">#{player.rank}</p>
          <h3 className="truncate text-lg font-black text-brand-ink">{player.display_name}</h3>
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
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-brand-ink/45">Medals</p>
        <div className="flex flex-wrap gap-2">
          <MedalBadge medalKey="winner_first_win" count={Math.min(1, player.medal_count ?? 0)} />
          {(player.medal_count ?? 0) > 2 ? <MedalBadge medalKey="winning_streak_3" /> : null}
          {player.best_win_streak >= 5 ? <MedalBadge medalKey="bloodthirsty_5" /> : null}
          {player.best_win_streak >= 10 ? <MedalBadge medalKey="merciless_10" /> : null}
          {player.best_win_streak >= 15 ? <MedalBadge medalKey="ruthless_15" /> : null}
          {player.best_win_streak >= 20 ? <MedalBadge medalKey="relentless_20" /> : null}
          {player.best_win_streak >= 25 ? <MedalBadge medalKey="brutal_25" /> : null}
          {player.best_win_streak >= 30 ? <MedalBadge medalKey="nuclear_30" /> : null}
          {(player.medal_count ?? 0) > 4 ? <MedalBadge medalKey="giant_slayer" /> : null}
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-brand-ink/45">Head to head</p>
        <div className="grid gap-2">
          {(player.head_to_head ?? []).slice(0, 4).map((rivalry) => (
            <div key={rivalry.opponentId} className="rounded-[18px] border border-brand-ink/10 bg-brand-paper p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-black text-brand-ink">vs {rivalry.opponentName}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-black ${
                    rivalry.currentStreakType === "win"
                      ? "bg-brand-orange text-white"
                      : rivalry.currentStreakType === "loss"
                        ? "bg-brand-ink text-white"
                        : "bg-white text-brand-ink"
                  }`}
                >
                  {formatRivalryStreak(rivalry.currentStreakType, rivalry.currentStreak)}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-brand-ink/55">
                {rivalry.wins}-{rivalry.losses}-{rivalry.draws} matches · rounds {rivalry.roundsFor}-{rivalry.roundsAgainst}
              </p>
            </div>
          ))}
          {(player.head_to_head ?? []).length === 0 ? (
            <p className="rounded-[18px] border border-brand-ink/10 bg-brand-paper p-3 text-sm font-bold text-brand-ink/55">
              No rivalries yet.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function formatRivalryStreak(type: "win" | "loss" | "draw" | "none", count: number) {
  if (type === "win") return `W${count}`;
  if (type === "loss") return `L${count}`;
  if (type === "draw") return "D";
  return "-";
}

function DetailChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-brand-ink/10 bg-brand-paper p-3">
      <div className="mb-1 flex items-center gap-1.5 text-brand-ink/45">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="text-base font-black text-brand-ink">{value}</p>
    </div>
  );
}
