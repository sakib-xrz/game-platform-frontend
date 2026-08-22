"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, X } from "lucide-react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { getOptionDisplayName, OptionArtwork } from "@/lib/option-art";
import { formatInteger, formatMultiplier, multiplyRational } from "@/lib/format";
import { playerDisplayName } from "@/lib/player-display";
import type { GreedySnapshot } from "@/types/greedy";

type ModalClock = {
  roundId: string;
  deadline: number;
  now: number;
};

export function ResultModal({
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
  const displayMs = Math.max(
    800,
    Math.min(displayDurationMs, 7_000),
  );
  const [clock, setClock] = useState<ModalClock>({ roundId: "", deadline: 0, now: 0 });
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !resultRoundId) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      previouslyFocused?.focus();
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
    if (!winningOption) {
      return { stake, winningStake: 0n, payout: 0n };
    }

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
    ? Math.max(0, Math.ceil((clock.deadline - clock.now) / 1000))
    : Math.ceil(displayMs / 1000);
  const winner = result.winning_option;
  const winnerName = getOptionDisplayName(winner.code, winner.name);
  const hasWon = totals.winningStake > 0n && totals.payout > 0n;
  const payoutLabel = formatInteger(totals.payout);
  const multiplier = winner.payout_multiplier
    || formatMultiplier(winner.payout_numerator, winner.payout_denominator);
  const topWinners = [...(result.top_winners ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  return (
    <div
      className="result-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="greedy-result-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="result-sheet">
        <h2 id="greedy-result-title" className="sr-only">Round {round.round_number} result</h2>
        <button ref={closeButtonRef} type="button" onClick={onClose} className="result-sheet__close" aria-label="Close result">
          <X aria-hidden="true" />
        </button>
        <span className="result-sheet__timer">({secondsLeft}s)</span>
        <div className="result-sheet__confetti result-sheet__confetti--left" aria-hidden="true">〰︎</div>
        <div className="result-sheet__confetti result-sheet__confetti--right" aria-hidden="true">⌁</div>

        <div className="result-sheet__winner-art">
          <OptionArtwork
            imageUrl={winner.image_url}
            code={winner.code}
            name={winnerName}
            className="result-sheet__winner-image"
          />
        </div>

        <div className={`result-card${hasWon ? " result-card--win" : ""}`}>
          <p className="result-card__eyebrow" aria-live="polite">
            {hasWon ? "YOU WIN" : "ROUND RESULT"}
          </p>
          <h3>{winnerName}</h3>
          <p className="result-card__round">Round {round.round_number} winning item · {multiplier}</p>

          <div className="result-card__payout">
            <span>Your gross payout</span>
            <strong><span className="game-gem" aria-hidden="true">◆</span>{payoutLabel}</strong>
            <small>
              {hasWon
                ? `${formatInteger(totals.winningStake)} winning stake × ${multiplier}`
                : totals.stake > 0n
                  ? "Your selected items did not win this round"
                  : "You did not place a bet this round"}
            </small>
          </div>

          <div className="result-card__divider"><span>Top 3 winners</span></div>

          {topWinners.length > 0 ? (
            <ol className="result-leaderboard">
              {topWinners.map((topWinner) => {
                const isCurrentPlayer = topWinner.user_id === snapshot.wallet.user_id;
                return (
                  <li key={topWinner.user_id} className={`result-leaderboard__row result-leaderboard__row--${topWinner.rank}`}>
                    <span className="result-leaderboard__rank" aria-label={`Rank ${topWinner.rank}`}>
                      <Crown aria-hidden="true" />
                      <b>{topWinner.rank}</b>
                    </span>
                    <PlayerAvatar player={topWinner} className="result-leaderboard__avatar" />
                    <span className="result-leaderboard__player">
                      <strong>{playerDisplayName(topWinner)}{isCurrentPlayer ? " (You)" : ""}</strong>
                      <small>{formatInteger(topWinner.winning_stake)} winning stake · {topWinner.bet_count} {topWinner.bet_count === 1 ? "bet" : "bets"}</small>
                    </span>
                    <b className="result-leaderboard__payout"><span className="game-gem" aria-hidden="true">◆</span>{formatInteger(topWinner.total_payout)}</b>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="result-leaderboard__empty">No player selected the winning item.</p>
          )}

          <p className="result-card__note">All winning players are paid. The podium only highlights the three biggest gross payouts.</p>
        </div>
      </section>
    </div>
  );
}
