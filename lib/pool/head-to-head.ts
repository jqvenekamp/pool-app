import type { HeadToHeadSummary, LadderPlayer } from "@/lib/pool/ladder";

export type MatchRecord = {
  id?: string;
  player_one_id: string;
  player_two_id: string;
  player_one_rounds: number;
  player_two_rounds: number;
  played_at?: string | null;
};

type MutableSummary = Omit<HeadToHeadSummary, "recentResults"> & {
  recentResults: string[];
  latestRunType: "win" | "loss" | "draw" | "none";
};

export function buildHeadToHeadSummaries(players: LadderPlayer[], matches: MatchRecord[]) {
  const playerNames = new Map(players.map((player) => [player.id, player.display_name]));
  const summaries = new Map<string, Map<string, MutableSummary>>();
  const sortedMatches = [...matches].sort((a, b) => Date.parse(a.played_at ?? "") - Date.parse(b.played_at ?? ""));

  for (const match of sortedMatches) {
    ensureSummary(summaries, match.player_one_id, match.player_two_id, playerNames.get(match.player_two_id) ?? "Opponent");
    ensureSummary(summaries, match.player_two_id, match.player_one_id, playerNames.get(match.player_one_id) ?? "Opponent");

    const playerOneResult = getMatchResult(match.player_one_rounds, match.player_two_rounds);
    const playerTwoResult = invertResult(playerOneResult);

    applyMatch(summaries.get(match.player_one_id)?.get(match.player_two_id), playerOneResult, match.player_one_rounds, match.player_two_rounds, match.played_at ?? null);
    applyMatch(summaries.get(match.player_two_id)?.get(match.player_one_id), playerTwoResult, match.player_two_rounds, match.player_one_rounds, match.played_at ?? null);
  }

  return new Map(
    [...summaries.entries()].map(([playerId, opponents]) => [
      playerId,
      [...opponents.values()]
        .sort((a, b) => {
          const byStreak = b.currentStreak - a.currentStreak;
          if (byStreak !== 0) return byStreak;

          return Date.parse(b.lastPlayedAt ?? "") - Date.parse(a.lastPlayedAt ?? "");
        })
        .map((summary) => ({
          opponentId: summary.opponentId,
          opponentName: summary.opponentName,
          wins: summary.wins,
          losses: summary.losses,
          draws: summary.draws,
          roundsFor: summary.roundsFor,
          roundsAgainst: summary.roundsAgainst,
          currentStreak: summary.currentStreak,
          currentStreakType: summary.currentStreakType,
          bestWinStreak: summary.bestWinStreak,
          recentResults: summary.recentResults,
          lastPlayedAt: summary.lastPlayedAt,
        })),
    ]),
  );
}

export function enrichPlayersWithHeadToHead(players: LadderPlayer[], matches: MatchRecord[]) {
  const summaries = buildHeadToHeadSummaries(players, matches);

  return players.map((player) => ({
    ...player,
    head_to_head: summaries.get(player.id) ?? player.head_to_head ?? [],
  }));
}

function ensureSummary(
  summaries: Map<string, Map<string, MutableSummary>>,
  playerId: string,
  opponentId: string,
  opponentName: string,
) {
  if (!summaries.has(playerId)) {
    summaries.set(playerId, new Map());
  }

  const opponents = summaries.get(playerId);
  if (!opponents?.has(opponentId)) {
    opponents?.set(opponentId, {
      opponentId,
      opponentName,
      wins: 0,
      losses: 0,
      draws: 0,
      roundsFor: 0,
      roundsAgainst: 0,
      currentStreak: 0,
      currentStreakType: "none",
      latestRunType: "none",
      bestWinStreak: 0,
      recentResults: [],
      lastPlayedAt: null,
    });
  }
}

function applyMatch(
  summary: MutableSummary | undefined,
  result: "W" | "L" | "D",
  roundsFor: number,
  roundsAgainst: number,
  playedAt: string | null,
) {
  if (!summary) return;

  summary.roundsFor += roundsFor;
  summary.roundsAgainst += roundsAgainst;
  summary.lastPlayedAt = playedAt;
  summary.recentResults = [result, ...summary.recentResults].slice(0, 5);

  if (result === "W") {
    summary.wins += 1;
    summary.currentStreak = summary.latestRunType === "win" ? summary.currentStreak + 1 : 1;
    summary.currentStreakType = "win";
    summary.latestRunType = "win";
    summary.bestWinStreak = Math.max(summary.bestWinStreak, summary.currentStreak);
    return;
  }

  if (result === "L") {
    summary.losses += 1;
    summary.currentStreak = summary.latestRunType === "loss" ? summary.currentStreak + 1 : 1;
    summary.currentStreakType = "loss";
    summary.latestRunType = "loss";
    return;
  }

  summary.draws += 1;
  summary.currentStreak = 0;
  summary.currentStreakType = "draw";
  summary.latestRunType = "draw";
}

function getMatchResult(roundsFor: number, roundsAgainst: number) {
  if (roundsFor > roundsAgainst) return "W";
  if (roundsFor < roundsAgainst) return "L";
  return "D";
}

function invertResult(result: "W" | "L" | "D") {
  if (result === "W") return "L";
  if (result === "L") return "W";
  return "D";
}
