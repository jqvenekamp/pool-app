import { describe, expect, it } from "vitest";
import { calculateRating } from "@/lib/pool/rating";

describe("calculateRating", () => {
  it("does not meaningfully change equal new players on a 1-1 draw", () => {
    const result = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 0,
      playerTwoGames: 0,
      playerOneRounds: 1,
      playerTwoRounds: 1,
    });

    expect(Math.abs(result.playerOne.delta)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(result.playerTwo.delta)).toBeLessThanOrEqual(0.01);
  });

  it("drops a high-rated player who draws a lower-rated player", () => {
    const result = calculateRating({
      playerOneStars: 4,
      playerTwoStars: 2,
      playerOneGames: 20,
      playerTwoGames: 20,
      playerOneRounds: 1,
      playerTwoRounds: 1,
    });

    expect(result.playerOne.delta).toBeLessThan(0);
  });

  it("raises a low-rated player who draws a higher-rated player", () => {
    const result = calculateRating({
      playerOneStars: 4,
      playerTwoStars: 2,
      playerOneGames: 20,
      playerTwoGames: 20,
      playerOneRounds: 1,
      playerTwoRounds: 1,
    });

    expect(result.playerTwo.delta).toBeGreaterThan(0);
  });

  it("makes 2-0 matter more than 1-0, while capping long sessions", () => {
    const single = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 12,
      playerTwoGames: 12,
      playerOneRounds: 1,
      playerTwoRounds: 0,
    });
    const double = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 12,
      playerTwoGames: 12,
      playerOneRounds: 2,
      playerTwoRounds: 0,
    });
    const long = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 12,
      playerTwoGames: 12,
      playerOneRounds: 9,
      playerTwoRounds: 0,
    });

    expect(double.playerOne.delta).toBeGreaterThan(single.playerOne.delta);
    expect(long.playerOne.kFactor).toBeLessThanOrEqual(0.576);
  });

  it("moves new players faster than experienced players", () => {
    const fresh = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 0,
      playerTwoGames: 0,
      playerOneRounds: 1,
      playerTwoRounds: 0,
    });
    const experienced = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 25,
      playerTwoGames: 25,
      playerOneRounds: 1,
      playerTwoRounds: 0,
    });

    expect(fresh.playerOne.delta).toBeGreaterThan(experienced.playerOne.delta);
  });

  it("keeps ratings between one and five stars", () => {
    const floor = calculateRating({
      playerOneStars: 1,
      playerTwoStars: 5,
      playerOneGames: 0,
      playerTwoGames: 50,
      playerOneRounds: 0,
      playerTwoRounds: 10,
    });
    const ceiling = calculateRating({
      playerOneStars: 5,
      playerTwoStars: 1,
      playerOneGames: 50,
      playerTwoGames: 0,
      playerOneRounds: 10,
      playerTwoRounds: 0,
    });

    expect(floor.playerOne.after).toBeGreaterThanOrEqual(1);
    expect(ceiling.playerOne.after).toBeLessThanOrEqual(5);
  });

  it("does not send a provisional player back to the floor after one early upset loss", () => {
    const firstWin = calculateRating({
      playerOneStars: 2,
      playerTwoStars: 2,
      playerOneGames: 0,
      playerTwoGames: 0,
      playerOneRounds: 1,
      playerTwoRounds: 0,
    });
    const secondWin = calculateRating({
      playerOneStars: firstWin.playerOne.after,
      playerTwoStars: 2,
      playerOneGames: 1,
      playerTwoGames: 0,
      playerOneRounds: 1,
      playerTwoRounds: 0,
    });
    const upsetLoss = calculateRating({
      playerOneStars: secondWin.playerOne.after,
      playerTwoStars: 2,
      playerOneGames: 2,
      playerTwoGames: 0,
      playerOneRounds: 0,
      playerTwoRounds: 1,
    });

    expect(upsetLoss.playerOne.after).toBeGreaterThan(2);
    expect(upsetLoss.playerOne.delta).toBeGreaterThanOrEqual(-0.18);
  });
});
