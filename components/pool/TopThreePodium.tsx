"use client";

import { Crown, Medal } from "lucide-react";
import { StarMeter } from "@/components/pool/StarMeter";
import type { RankedPlayer } from "@/lib/pool/ladder";

export function TopThreePodium({ players }: { players: RankedPlayer[] }) {
  const topThree = players.slice(0, 3);
  const order = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((player) => {
        const isFirst = player.rank === 1;

        return (
          <article
            key={player.id}
            className={`rounded-lg border p-3 text-center ${
              isFirst
                ? "border-brass-400/50 bg-brass-400/16 pb-7 shadow-glow"
                : "border-white/10 bg-white/[0.055] pb-4"
            }`}
          >
            <div className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-black/25 text-brass-400">
              {isFirst ? <Crown size={18} aria-hidden="true" /> : <Medal size={17} aria-hidden="true" />}
            </div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brass-400">#{player.rank}</p>
            <h3 className="mt-1 truncate text-sm font-black text-white">{player.display_name}</h3>
            <div className="mt-2">
              <StarMeter value={player.stars} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
