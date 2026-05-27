import { CircleDot, Trophy } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="felt-grid min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-[18px] bg-brand-orange text-white shadow-glow">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-orange">Incentro Pool</p>
              <h1 className="text-2xl font-black leading-tight text-brand-ink sm:text-3xl">Office ladder</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-brand-ink/10 bg-white px-3 py-1.5 text-xs font-black text-brand-ink shadow-sm sm:flex">
            <CircleDot size={12} className="text-brand-orange" aria-hidden="true" />
            Local office mode
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
