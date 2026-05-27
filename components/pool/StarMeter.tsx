"use client";

export function StarMeter({ value }: { value: number }) {
  const percentage = Math.max(0, Math.min(100, ((value - 1) / 4) * 100));

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-brand-ink/40">1.0</span>
        <span className="text-xs font-black text-brand-orange">{value.toFixed(2)}</span>
        <span className="text-[11px] font-bold text-brand-ink/40">5.0</span>
      </div>
      <div className="h-2 rounded-full bg-brand-ink/10">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-mint via-brand-orange to-brand-blue" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
