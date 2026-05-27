import { describe, expect, it } from "vitest";
import { createUnderTableChallenge, evaluateMedalAwards } from "@/lib/pool/medals";

const basePlayer = {
  id: "player-one",
  stars: 2,
  roundsWonBefore: 4,
  currentWinStreakBefore: 0,
  currentWinStreakAfter: 0,
  matchRoundsWon: 0,
  matchRoundsLost: 0,
};

describe("evaluateMedalAwards", () => {
  it("awards Winning Streak at exactly 3 consecutive round wins", () => {
    const awards = evaluateMedalAwards({
      playerOne: {
        ...basePlayer,
        currentWinStreakBefore: 2,
        currentWinStreakAfter: 3,
        matchRoundsWon: 1,
      },
      playerTwo: { ...basePlayer, id: "player-two" },
    });

    expect(awards).toContainEqual({ playerId: "player-one", medalKey: "winning_streak_3" });
  });

  it("awards Bloodthirsty at exactly 5 consecutive round wins", () => {
    const awards = evaluateMedalAwards({
      playerOne: {
        ...basePlayer,
        currentWinStreakBefore: 4,
        currentWinStreakAfter: 5,
        matchRoundsWon: 1,
      },
      playerTwo: { ...basePlayer, id: "player-two" },
    });

    expect(awards).toContainEqual({ playerId: "player-one", medalKey: "bloodthirsty_5" });
  });

  it("awards Winner! for a first round win", () => {
    const awards = evaluateMedalAwards({
      playerOne: {
        ...basePlayer,
        roundsWonBefore: 0,
        matchRoundsWon: 1,
      },
      playerTwo: { ...basePlayer, id: "player-two" },
    });

    expect(awards).toContainEqual({ playerId: "player-one", medalKey: "winner_first_win" });
  });

  it("awards Payback only when there is a previous loss", () => {
    const withPriorLoss = evaluateMedalAwards({
      playerOne: {
        ...basePlayer,
        matchRoundsWon: 2,
        matchRoundsLost: 1,
        priorLossToOpponent: true,
      },
      playerTwo: { ...basePlayer, id: "player-two", matchRoundsWon: 1, matchRoundsLost: 2 },
    });
    const withoutPriorLoss = evaluateMedalAwards({
      playerOne: {
        ...basePlayer,
        matchRoundsWon: 2,
        matchRoundsLost: 1,
        priorLossToOpponent: false,
      },
      playerTwo: { ...basePlayer, id: "player-two", matchRoundsWon: 1, matchRoundsLost: 2 },
    });

    expect(withPriorLoss.some((award) => award.medalKey === "payback")).toBe(true);
    expect(withoutPriorLoss.some((award) => award.medalKey === "payback")).toBe(false);
  });

  it("creates an under-table challenge payload", () => {
    expect(createUnderTableChallenge("match-id", "No way")).toEqual({
      match_id: "match-id",
      medal_key: "under_table",
      status: "pending",
      reason: "No way",
    });
  });
});
