import { Trophy } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="felt-grid min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border border-brass-400/30 bg-brass-400/15 text-brass-400 shadow-glow">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brass-400">Office Pool</p>
              <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">Pool Ladder</h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/75 sm:block">
            Felt table mode
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
