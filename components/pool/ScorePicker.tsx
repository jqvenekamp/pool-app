"use client";

import { Minus, Plus } from "lucide-react";

export function ScorePicker({
  playerOneName,
  playerTwoName,
  playerOneRounds,
  playerTwoRounds,
  onPlayerOneRounds,
  onPlayerTwoRounds,
}: {
  playerOneName: string;
  playerTwoName: string;
  playerOneRounds: number;
  playerTwoRounds: number;
  onPlayerOneRounds: (value: number) => void;
  onPlayerTwoRounds: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/18 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Rounds</p>
        <p className="text-sm font-black text-brass-400">
          {playerOneRounds}-{playerTwoRounds}
        </p>
      </div>
      <div className="grid gap-3">
        <Counter label={playerOneName} value={playerOneRounds} onChange={onPlayerOneRounds} />
        <Counter label={playerTwoName} value={playerTwoRounds} onChange={onPlayerTwoRounds} />
      </div>
    </div>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <span className="truncate text-sm font-semibold text-white">{label}</span>
      <div className="grid grid-cols-[2.5rem_3rem_2.5rem] items-center rounded-lg border border-white/10 bg-felt-950/60">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="focus-ring grid size-10 place-items-center rounded-md text-white/70 hover:text-white"
          aria-label={`Decrease ${label} rounds`}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <span className="text-center text-base font-black text-white">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(25, value + 1))}
          className="focus-ring grid size-10 place-items-center rounded-md text-white/70 hover:text-white"
          aria-label={`Increase ${label} rounds`}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
