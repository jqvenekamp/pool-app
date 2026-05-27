"use client";

export function StarMeter({ value }: { value: number }) {
  const percentage = Math.max(0, Math.min(100, ((value - 1) / 4) * 100));

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-white/50">1.0</span>
        <span className="text-xs font-black text-brass-400">{value.toFixed(2)}</span>
        <span className="text-[11px] font-bold text-white/50">5.0</span>
      </div>
      <div className="h-2 rounded-full bg-black/35">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-brass-400 to-amber-200" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
