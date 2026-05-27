export type LadderPlayer = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  active?: boolean | null;
  stars: number;
  games_played: number;
  rounds_won: number;
  rounds_lost: number;
  current_win_streak: number;
  best_win_streak: number;
  recent_form?: string[];
  medal_count?: number;
  last_win_at?: string | null;
};

export type RankedPlayer = LadderPlayer & {
  rank: number;
  winPercentage: number;
};

export function winPercentage(player: Pick<LadderPlayer, "rounds_won" | "rounds_lost">) {
  const total = player.rounds_won + player.rounds_lost;
  return total === 0 ? 0 : player.rounds_won / total;
}

export function sortLadder(players: LadderPlayer[]): RankedPlayer[] {
  return [...players]
    .filter((player) => player.active !== false)
    .sort((a, b) => {
      const stars = b.stars - a.stars;
      if (stars !== 0) return stars;

      const roundsWon = b.rounds_won - a.rounds_won;
      if (roundsWon !== 0) return roundsWon;

      const percentage = winPercentage(b) - winPercentage(a);
      if (percentage !== 0) return percentage;

      const lastWin = Date.parse(b.last_win_at ?? "") - Date.parse(a.last_win_at ?? "");
      if (lastWin !== 0 && Number.isFinite(lastWin)) return lastWin;

      return a.display_name.localeCompare(b.display_name);
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
      winPercentage: winPercentage(player),
    }));
}

export function recentFormLabel(form: string[] = []) {
  return form.length > 0 ? form.slice(0, 5).join(" ") : "New";
}
