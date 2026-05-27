"use client";

import { BadgeAlert, Flame, RotateCcw, Skull, Sparkles, Sword, Trophy } from "lucide-react";
import { MEDAL_DEFINITIONS, type MedalKey } from "@/lib/pool/medals";

const icons = {
  trophy: Trophy,
  flame: Flame,
  skull: Skull,
  "rotate-ccw": RotateCcw,
  "badge-alert": BadgeAlert,
  sword: Sword,
  sparkles: Sparkles,
};

export function MedalBadge({ medalKey, count }: { medalKey: MedalKey; count?: number }) {
  const medal = MEDAL_DEFINITIONS.find((item) => item.key === medalKey) ?? MEDAL_DEFINITIONS[0];
  const Icon = icons[medal.icon];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass-400/30 bg-brass-400/12 px-2.5 py-1 text-xs font-bold text-brass-400">
      <Icon size={13} aria-hidden="true" />
      {medal.name}
      {count ? <span className="text-white/60">x{count}</span> : null}
    </span>
  );
}
