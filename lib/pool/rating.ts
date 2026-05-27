export type RatingInput = {
  playerOneStars: number;
  playerTwoStars: number;
  playerOneGames: number;
  playerTwoGames: number;
  playerOneRounds: number;
  playerTwoRounds: number;
};

export type RatingPlayerResult = {
  expected: number;
  actual: number;
  before: number;
  after: number;
  delta: number;
  kFactor: number;
};

export type RatingResult = {
  playerOne: RatingPlayerResult;
  playerTwo: RatingPlayerResult;
  totalRounds: number;
};

const MIN_STARS = 1;
const MAX_STARS = 5;
const CENTER_STARS = 3;
const STARTING_STARS = 2;
const BASE_K = 0.32;
const FORMULA_VERSION = "star_elo_v2";

export { FORMULA_VERSION, MAX_STARS, MIN_STARS, STARTING_STARS };

export function clampStars(value: number) {
  return Math.min(MAX_STARS, Math.max(MIN_STARS, value));
}

export function roundRating(value: number, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function expectedScore(playerStars: number, opponentStars: number) {
  return 1 / (1 + Math.pow(10, (opponentStars - playerStars) / 1.2));
}

export function actualScores(playerOneRounds: number, playerTwoRounds: number) {
  const totalRounds = playerOneRounds + playerTwoRounds;

  if (totalRounds <= 0) {
    throw new Error("A match needs at least one round.");
  }

  return {
    playerOne: playerOneRounds / totalRounds,
    playerTwo: playerTwoRounds / totalRounds,
    totalRounds,
  };
}

export function dynamicKFactor(currentStars: number, playerGames: number, totalRounds: number) {
  const roundMultiplier = Math.min(1.8, Math.sqrt(totalRounds));
  const earlyMultiplier = playerGames < 10 ? 1.65 - playerGames * 0.065 : 1;
  const topDampening = 1 - 0.55 * Math.max(0, (currentStars - CENTER_STARS) / 2) ** 2;

  return BASE_K * roundMultiplier * earlyMultiplier * Math.max(0.35, topDampening);
}

function nextRating(currentStars: number, playerGames: number, actual: number, expected: number, totalRounds: number) {
  const kFactor = dynamicKFactor(currentStars, playerGames, totalRounds);
  const rawDelta = kFactor * (actual - expected);
  const matchDelta = applyProvisionalLossCap(rawDelta, playerGames);
  const distributionPressure = 0.03 * (CENTER_STARS - currentStars) * Math.min(1, (playerGames + 4) / 16);
  const after = clampStars(currentStars + matchDelta + distributionPressure);

  return {
    after: roundRating(after),
    delta: roundRating(after - currentStars),
    kFactor: roundRating(kFactor),
  };
}

function applyProvisionalLossCap(rawDelta: number, playerGames: number) {
  if (rawDelta >= 0 || playerGames >= 10) {
    return rawDelta;
  }

  const maxLoss = playerGames < 5 ? 0.18 : 0.25;
  return Math.max(rawDelta, -maxLoss);
}

export function calculateRating(input: RatingInput): RatingResult {
  const scores = actualScores(input.playerOneRounds, input.playerTwoRounds);
  const playerOneExpected = expectedScore(input.playerOneStars, input.playerTwoStars);
  const playerTwoExpected = 1 - playerOneExpected;
  const playerOneNext = nextRating(
    input.playerOneStars,
    input.playerOneGames,
    scores.playerOne,
    playerOneExpected,
    scores.totalRounds,
  );
  const playerTwoNext = nextRating(
    input.playerTwoStars,
    input.playerTwoGames,
    scores.playerTwo,
    playerTwoExpected,
    scores.totalRounds,
  );

  return {
    totalRounds: scores.totalRounds,
    playerOne: {
      expected: roundRating(playerOneExpected, 4),
      actual: roundRating(scores.playerOne, 4),
      before: roundRating(input.playerOneStars),
      after: playerOneNext.after,
      delta: playerOneNext.delta,
      kFactor: playerOneNext.kFactor,
    },
    playerTwo: {
      expected: roundRating(playerTwoExpected, 4),
      actual: roundRating(scores.playerTwo, 4),
      before: roundRating(input.playerTwoStars),
      after: playerTwoNext.after,
      delta: playerTwoNext.delta,
      kFactor: playerTwoNext.kFactor,
    },
  };
}
