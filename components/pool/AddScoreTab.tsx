"use client";

import { useMemo, useState } from "react";
import { BadgeAlert, Check, Loader2, Plus, Sparkles, UserPlus } from "lucide-react";
import { MedalBadge } from "@/components/pool/MedalBadge";
import { PlayerSelect } from "@/components/pool/PlayerSelect";
import { ScorePicker } from "@/components/pool/ScorePicker";
import { calculateRating } from "@/lib/pool/rating";
import type { RankedPlayer } from "@/lib/pool/ladder";
import type { MedalAward } from "@/lib/pool/medals";

type SubmitResponse = {
  error?: string;
  rating?: ReturnType<typeof calculateRating>;
  medalAwards?: MedalAward[];
  ladder?: RankedPlayer[];
};

type AddPlayerResponse = {
  error?: string;
  players?: RankedPlayer[];
  demoMode?: boolean;
};

export function AddScoreTab({
  loading,
  players,
  onPlayersChanged,
  onSubmitted,
}: {
  loading: boolean;
  players: RankedPlayer[];
  onPlayersChanged: (players: RankedPlayer[], demoMode?: boolean) => void;
  onSubmitted: (players: RankedPlayer[]) => void;
}) {
  const [playerOneId, setPlayerOneId] = useState("");
  const [playerTwoId, setPlayerTwoId] = useState("");
  const [playerOneRounds, setPlayerOneRounds] = useState(1);
  const [playerTwoRounds, setPlayerTwoRounds] = useState(0);
  const [underTable, setUnderTable] = useState(false);
  const [underTablePlayerId, setUnderTablePlayerId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SubmitResponse | null>(null);

  const playerOne = players.find((player) => player.id === playerOneId);
  const playerTwo = players.find((player) => player.id === playerTwoId);

  const preview = useMemo(() => {
    if (!playerOne || !playerTwo || playerOneRounds + playerTwoRounds <= 0) return null;

    return calculateRating({
      playerOneStars: playerOne.stars,
      playerTwoStars: playerTwo.stars,
      playerOneGames: playerOne.games_played,
      playerTwoGames: playerTwo.games_played,
      playerOneRounds,
      playerTwoRounds,
    });
  }, [playerOne, playerOneRounds, playerTwo, playerTwoRounds]);

  async function submitScore() {
    setError(null);
    setLastResult(null);

    if (!playerOne || !playerTwo) {
      setError("Select both players first.");
      return;
    }

    if (playerOne.id === playerTwo.id) {
      setError("A player cannot play against themselves.");
      return;
    }

    if (underTable && !underTablePlayerId) {
      setError("Select who earned Onder de tafel door.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/pool/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerOneId: playerOne.id,
          playerTwoId: playerTwo.id,
          playerOneRounds,
          playerTwoRounds,
          underTablePlayerId: underTable ? underTablePlayerId : null,
          notes: notes.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as SubmitResponse;

      if (!response.ok || !payload.ladder) {
        throw new Error(payload.error ?? "Could not submit the score.");
      }

      setLastResult(payload);
      onSubmitted(payload.ladder);
      setNotes("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit the score.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addPlayer() {
    setPlayerError(null);

    if (!newPlayerName.trim()) {
      setPlayerError("Add a name first.");
      return;
    }

    setAddingPlayer(true);

    try {
      const response = await fetch("/api/pool/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newPlayerName }),
      });
      const payload = (await response.json()) as AddPlayerResponse;

      if (!response.ok || !payload.players) {
        throw new Error(payload.error ?? "Could not add player.");
      }

      onPlayersChanged(payload.players, payload.demoMode);
      setNewPlayerName("");
    } catch (caught) {
      setPlayerError(caught instanceof Error ? caught.message : "Could not add player.");
    } finally {
      setAddingPlayer(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-brand-ink/10 bg-white p-4 shadow-xl shadow-brand-ink/5 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-brand-ink">Add score</h2>
          <p className="mt-1 text-sm font-semibold text-brand-ink/60">Pick players, set rounds, submit while the table is still warm.</p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-[18px] bg-brand-orange/10 text-brand-orange">
          <Sparkles size={20} aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-[18px] border border-brand-orange/20 bg-brand-blush/45 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-brand-ink">
            <UserPlus size={16} className="text-brand-orange" aria-hidden="true" />
            Add player
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addPlayer();
              }}
              placeholder="Colleague name"
              className="focus-ring h-11 rounded-[14px] border border-brand-ink/10 bg-white px-3 text-sm font-bold text-brand-ink placeholder:text-brand-ink/35"
            />
            <button
              type="button"
              onClick={addPlayer}
              disabled={addingPlayer}
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-brand-ink px-4 text-sm font-black text-white transition hover:bg-brand-graphite disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingPlayer ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              Add
            </button>
          </div>
          {playerError ? <p className="mt-2 text-xs font-bold text-red-700">{playerError}</p> : null}
        </div>

        <PlayerSelect
          label="Player 1"
          value={playerOneId}
          onChange={(value) => {
            setPlayerOneId(value);
            if (value === playerTwoId) setPlayerTwoId("");
          }}
          disabled={loading}
          players={players}
          blockedPlayerId={playerTwoId}
        />
        <PlayerSelect
          label="Player 2"
          value={playerTwoId}
          onChange={(value) => {
            setPlayerTwoId(value);
            if (value === playerOneId) setPlayerOneId("");
          }}
          disabled={loading}
          players={players}
          blockedPlayerId={playerOneId}
        />

        <ScorePicker
          playerOneName={playerOne?.display_name ?? "Player 1"}
          playerTwoName={playerTwo?.display_name ?? "Player 2"}
          playerOneRounds={playerOneRounds}
          playerTwoRounds={playerTwoRounds}
          onPlayerOneRounds={setPlayerOneRounds}
          onPlayerTwoRounds={setPlayerTwoRounds}
        />

        <label className="flex items-start gap-3 rounded-[18px] border border-brand-ink/10 bg-brand-paper p-3">
          <input
            type="checkbox"
            checked={underTable}
            onChange={(event) => {
              setUnderTable(event.target.checked);
              if (!event.target.checked) setUnderTablePlayerId("");
            }}
            className="mt-1 size-4 accent-brand-orange"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-black text-brand-ink">
              <BadgeAlert size={16} aria-hidden="true" />
              Under de tafel door
            </span>
            <span className="mt-1 block text-xs font-semibold leading-5 text-brand-ink/55">Requires selecting the medal winner.</span>
          </span>
        </label>

        {underTable ? (
          <div className="grid grid-cols-2 gap-2">
            {[playerOne, playerTwo].map((player) => (
              <button
                type="button"
                key={player?.id ?? "empty"}
                disabled={!player}
                onClick={() => player && setUnderTablePlayerId(player.id)}
                className={`focus-ring rounded-[16px] border px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  player?.id === underTablePlayerId
                    ? "border-brand-orange bg-brand-orange text-white"
                    : "border-brand-ink/10 bg-white text-brand-ink/70"
                }`}
              >
                {player?.display_name ?? "Select player"}
              </button>
            ))}
          </div>
        ) : null}

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Notes"
          className="focus-ring w-full resize-none rounded-[18px] border border-brand-ink/10 bg-white px-3 py-3 text-sm font-semibold text-brand-ink placeholder:text-brand-ink/35"
        />

        {preview ? (
          <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-brand-orange/20 bg-brand-orange/10 p-3">
            <RatingPreview name={playerOne?.display_name ?? "Player 1"} before={preview.playerOne.before} delta={preview.playerOne.delta} after={preview.playerOne.after} />
            <RatingPreview name={playerTwo?.display_name ?? "Player 2"} before={preview.playerTwo.before} delta={preview.playerTwo.delta} after={preview.playerTwo.after} />
          </div>
        ) : null}

        {error ? <div className="rounded-[18px] border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}

        <button
          type="button"
          onClick={submitScore}
          disabled={submitting || loading || !playerOne || !playerTwo}
          className="focus-ring flex items-center justify-center gap-2 rounded-[18px] bg-brand-orange px-4 py-3 text-sm font-black text-white transition hover:bg-brass-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
          Save match
        </button>

        {lastResult?.medalAwards?.length ? (
          <div className="rounded-[18px] border border-brand-ink/10 bg-brand-paper p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Medals awarded</p>
            <div className="flex flex-wrap gap-2">
              {lastResult.medalAwards.map((award) => (
                <MedalBadge key={`${award.playerId}-${award.medalKey}`} medalKey={award.medalKey} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RatingPreview({ name, before, delta, after }: { name: string; before: number; delta: number; after: number }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-black text-brand-ink">{name}</p>
      <p className={`mt-1 text-sm font-black ${delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
        {before.toFixed(2)} {delta >= 0 ? "+" : ""}
        {delta.toFixed(3)} {"->"} {after.toFixed(2)}
      </p>
    </div>
  );
}
