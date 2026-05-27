export const MEDAL_DEFINITIONS = [
  {
    key: "winner_first_win",
    name: "Winner!",
    description: "Awarded for winning your first round.",
    icon: "trophy",
  },
  {
    key: "winning_streak_3",
    name: "Winning Streak",
    description: "Awarded for 3 consecutive round wins.",
    icon: "flame",
  },
  {
    key: "bloodthirsty_5",
    name: "Bloodthirsty",
    description: "Awarded for 5 consecutive round wins.",
    icon: "skull",
  },
  {
    key: "payback",
    name: "Payback",
    description: "Awarded for beating someone who beat you before.",
    icon: "rotate-ccw",
  },
  {
    key: "under_table",
    name: "Onder de tafel door",
    description: "Awarded when a player wins a round while the opponent pots zero balls.",
    icon: "badge-alert",
  },
  {
    key: "giant_slayer",
    name: "Giant Slayer",
    description: "Awarded for beating a player at least 1.5 stars higher.",
    icon: "sword",
  },
  {
    key: "clean_sweep",
    name: "Clean Sweep",
    description: "Awarded for winning a multi-round match without losing a round.",
    icon: "sparkles",
  },
] as const;

export type MedalKey = (typeof MEDAL_DEFINITIONS)[number]["key"];

export type MedalAward = {
  playerId: string;
  medalKey: MedalKey;
  metadata?: Record<string, unknown>;
};

export type MedalPlayerSnapshot = {
  id: string;
  stars: number;
  roundsWonBefore: number;
  currentWinStreakBefore: number;
  currentWinStreakAfter: number;
  matchRoundsWon: number;
  matchRoundsLost: number;
  priorLossToOpponent?: boolean;
};

export type MedalEvaluationInput = {
  playerOne: MedalPlayerSnapshot;
  playerTwo: MedalPlayerSnapshot;
  underTablePlayerId?: string | null;
};

export function evaluateMedalAwards(input: MedalEvaluationInput): MedalAward[] {
  const awards: MedalAward[] = [];
  const players = [input.playerOne, input.playerTwo];

  for (const player of players) {
    const opponent = player.id === input.playerOne.id ? input.playerTwo : input.playerOne;

    if (player.roundsWonBefore === 0 && player.matchRoundsWon > 0) {
      awards.push({ playerId: player.id, medalKey: "winner_first_win" });
    }

    if (player.currentWinStreakAfter === 3 && player.currentWinStreakBefore < 3) {
      awards.push({ playerId: player.id, medalKey: "winning_streak_3" });
    }

    if (player.currentWinStreakAfter === 5 && player.currentWinStreakBefore < 5) {
      awards.push({ playerId: player.id, medalKey: "bloodthirsty_5" });
    }

    if (player.matchRoundsWon > player.matchRoundsLost && player.priorLossToOpponent) {
      awards.push({ playerId: player.id, medalKey: "payback", metadata: { opponentId: opponent.id } });
    }

    if (player.matchRoundsWon > player.matchRoundsLost && opponent.stars - player.stars >= 1.5) {
      awards.push({
        playerId: player.id,
        medalKey: "giant_slayer",
        metadata: { opponentId: opponent.id, starGap: opponent.stars - player.stars },
      });
    }

    if (player.matchRoundsWon >= 2 && player.matchRoundsLost === 0) {
      awards.push({ playerId: player.id, medalKey: "clean_sweep" });
    }
  }

  if (input.underTablePlayerId) {
    awards.push({
      playerId: input.underTablePlayerId,
      medalKey: "under_table",
      metadata: { challengeable: true, status: "pending" },
    });
  }

  return dedupeAwards(awards);
}

export function createUnderTableChallenge(matchId: string, reason?: string) {
  return {
    match_id: matchId,
    medal_key: "under_table" satisfies MedalKey,
    status: "pending",
    reason: reason?.trim() || null,
  };
}

function dedupeAwards(awards: MedalAward[]) {
  const seen = new Set<string>();

  return awards.filter((award) => {
    const key = `${award.playerId}:${award.medalKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
