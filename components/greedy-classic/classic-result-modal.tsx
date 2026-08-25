"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, X } from "lucide-react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import {
  ClassicOptionArtwork,
  getClassicOptionDisplayName,
} from "@/lib/greedy-classic-art";
import {
  formatInteger,
  formatMultiplier,
  multiplyRational,
} from "@/lib/format";
import { playerDisplayName } from "@/lib/player-display";
import type { GreedySnapshot } from "@/types/greedy";

type ResultClock = {
  roundId: string;
  deadline: number;
  now: number;
};

export function ClassicResultModal({
  snapshot,
  open,
  displayDurationMs,
  onClose,
}: {
  snapshot: GreedySnapshot;
  open: boolean;
  displayDurationMs: number;
  onClose: () => void;
}) {
  const round = snapshot.round;
  const result = round?.result;
  const resultRoundId = result?.round_id;
  const displayMs = Math.max(800, Math.min(displayDurationMs, 7_000));
  const [clock, setClock] = useState<ResultClock>({
    roundId: "",
    deadline: 0,
    now: 0,
  });
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !resultRoundId) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, resultRoundId]);

  useEffect(() => {
    if (!open || !round?.id) return;
    const deadline = Date.now() + displayMs;
    const frame = window.requestAnimationFrame(() => {
      setClock({ roundId: round.id, deadline, now: Date.now() });
    });
    const timer = window.setInterval(() => {
      setClock((current) => ({ ...current, now: Date.now() }));
    }, 200);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [displayMs, open, round?.id]);

  const totals = useMemo(() => {
    const currentBets = snapshot.my_bets.filter((bet) => bet.round_id === round?.id);
    const stake = currentBets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n);
    const winningOption = round?.result?.winning_option;
    if (!winningOption) return { stake, winningStake: 0n, payout: 0n };

    const winningBets = currentBets.filter((bet) => bet.option.id === winningOption.id);
    const winningStake = winningBets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n);
    const calculatedPayout = BigInt(multiplyRational(
      winningStake.toString(),
      winningOption.payout_numerator,
      winningOption.payout_denominator,
    ));
    const leaderboardPayout = round.result?.top_winners?.find(
      (winner) => winner.user_id === snapshot.wallet.user_id,
    )?.total_payout;
    const settlementsReady = winningBets.length > 0
      && winningBets.every((bet) => bet.settlement !== null);
    const settledPayout = winningBets.reduce(
      (sum, bet) => sum + BigInt(bet.settlement?.payout_amount ?? "0"),
      0n,
    );
    const payout = leaderboardPayout !== undefined
      ? BigInt(leaderboardPayout)
      : settlementsReady
        ? settledPayout
        : calculatedPayout;

    return { stake, winningStake, payout };
  }, [round, snapshot.my_bets, snapshot.wallet.user_id]);

  if (!open || !round || !result) return null;

  const secondsLeft = clock.roundId === round.id
    ? Math.max(0, Math.ceil((clock.deadline - clock.now) / 1_000))
    : Math.ceil(displayMs / 1_000);
  const winner = result.winning_option;
  const winnerName = getClassicOptionDisplayName(
    winner.code,
    winner.name,
    winner.image_url,
  );
  const multiplier = winner.payout_multiplier
    || formatMultiplier(winner.payout_numerator, winner.payout_denominator);
  const hasWon = totals.winningStake > 0n && totals.payout > 0n;
  const topWinners = [...(result.top_winners ?? [])]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3);

  return (
    <div
      className="gc-result-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gc-result-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="gc-result">
        <h2 id="gc-result-title" className="sr-only">
          Round {round.round_number} result
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="gc-result__close"
          onClick={onClose}
          aria-label="Close result"
        >
          <X aria-hidden="true" />
        </button>
        <span className="gc-result__timer">{secondsLeft}s</span>
        <span className="gc-result__burst" aria-hidden="true" />

        <div className="gc-result__winner-art">
          <ClassicOptionArtwork
            imageUrl={winner.image_url}
            code={winner.code}
            name={winnerName}
            className="gc-result__winner-image"
          />
        </div>

        <div className="gc-result__card">
          <p className="gc-result__eyebrow" aria-live="polite">
            {hasWon ? "You win" : "Round result"}
          </p>
          <h3>{winnerName}</h3>
          <p>Round {round.round_number} · {multiplier}</p>

          <div className="gc-result__payout">
            <span>Your gross payout</span>
            <strong>{formatInteger(totals.payout)}</strong>
            <small>
              {hasWon
                ? `${formatInteger(totals.winningStake)} winning stake × ${multiplier}`
                : totals.stake > 0n
                  ? "Your selected items did not win this round"
                  : "You did not place a bet this round"}
            </small>
          </div>

          <div className="gc-result__divider"><span>Top winners</span></div>
          {topWinners.length ? (
            <ol className="gc-result__leaderboard">
              {topWinners.map((topWinner) => (
                <li key={topWinner.user_id}>
                  <span className="gc-result__rank" aria-label={`Rank ${topWinner.rank}`}>
                    <Crown aria-hidden="true" />
                    <b>{topWinner.rank}</b>
                  </span>
                  <PlayerAvatar player={topWinner} className="gc-result__avatar" />
                  <span>
                    <strong>
                      {playerDisplayName(topWinner)}
                      {topWinner.user_id === snapshot.wallet.user_id ? " (You)" : ""}
                    </strong>
                    <small>{formatInteger(topWinner.winning_stake)} winning stake</small>
                  </span>
                  <b>{formatInteger(topWinner.total_payout)}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="gc-result__empty">No player selected the winning item.</p>
          )}
        </div>
      </section>
    </div>
  );
}

