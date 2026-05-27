import { describe, expect, it } from "vitest";
import { buildHeadToHeadSummaries } from "@/lib/pool/head-to-head";

const players = [
  {
    id: "jelte",
    display_name: "Jelte",
    stars: 2,
    games_played: 0,
    rounds_won: 0,
    rounds_lost: 0,
    current_win_streak: 0,
    best_win_streak: 0,
  },
  {
    id: "jurre",
    display_name: "Jurre",
    stars: 2,
    games_played: 0,
    rounds_won: 0,
    rounds_lost: 0,
    current_win_streak: 0,
    best_win_streak: 0,
  },
];

describe("buildHeadToHeadSummaries", () => {
  it("tracks player-specific kill streaks against an opponent", () => {
    const summaries = buildHeadToHeadSummaries(players, [
      {
        player_one_id: "jelte",
        player_two_id: "jurre",
        player_one_rounds: 2,
        player_two_rounds: 0,
        played_at: "2026-05-20T12:00:00.000Z",
      },
      {
        player_one_id: "jurre",
        player_two_id: "jelte",
        player_one_rounds: 1,
        player_two_rounds: 2,
        played_at: "2026-05-21T12:00:00.000Z",
      },
      {
        player_one_id: "jelte",
        player_two_id: "jurre",
        player_one_rounds: 3,
        player_two_rounds: 2,
        played_at: "2026-05-22T12:00:00.000Z",
      },
    ]);

    expect(summaries.get("jelte")?.[0]).toMatchObject({
      opponentName: "Jurre",
      wins: 3,
      losses: 0,
      currentStreak: 3,
      currentStreakType: "win",
      bestWinStreak: 3,
    });
    expect(summaries.get("jurre")?.[0]).toMatchObject({
      opponentName: "Jelte",
      wins: 0,
      losses: 3,
      currentStreak: 3,
      currentStreakType: "loss",
    });
  });
});
