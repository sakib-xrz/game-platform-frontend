"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { Crown, X } from "lucide-react";
import { formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import { teenPattiPlayerName } from "@/lib/teen-patti-player-display";
import { PlayingCard } from "@/components/teen-patti/playing-card";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import type { TeenPattiSnapshot } from "@/types/teen-patti";

export function TeenPattiResultModal({
  snapshot,
  open,
  onClose,
}: {
  snapshot: TeenPattiSnapshot;
  open: boolean;
  onClose: () => void;
}) {
  const round = snapshot.round;
  const result = round?.result;
  const resultRoundId = result?.round_id;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !resultRoundId) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, resultRoundId]);

  if (!open || !round || !result) return null;

  const roundBets = snapshot.my_bets.filter((bet) => bet.round_id === round.id);
  const stake = roundBets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n);
  const payout = roundBets.reduce(
    (sum, bet) => sum + BigInt(bet.settlement?.payout_amount ?? "0"),
    0n,
  );
  const winnerId = result.winning_option.id;
  const winningBet = roundBets.some((bet) => bet.option.id === winnerId);
  const winningHand = result.hands?.find((hand) => hand.option_id === winnerId);
  const topWinners = [...(result.top_winners ?? [])]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3);
  const payoutPending = roundBets.some((bet) => !bet.settlement)
    && (round.status === "result_revealed" || round.status === "settling");
  const currencySymbol = snapshot.wallet.currency.symbol ?? "●";

  const won = stake > 0n && winningBet;
  const kicker = won
    ? "You backed the highest hand"
    : stake === 0n
      ? "You did not bet this round"
      : "Better luck next round";

  return (
    <div
      className="tp-result-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teen-patti-result-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={clsx("tp-result-sheet", won && "tp-result-sheet--win")}>
        <span className="tp-result-sheet__ornament" aria-hidden="true" />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="tp-result-close"
          aria-label="Close result"
        >
          <X aria-hidden="true" />
        </button>

        <div className="tp-result-emblem" aria-hidden="true">
          <span>♠</span>
          <b>{won ? "♛" : "♦"}</b>
          <span>♥</span>
        </div>
        <p className="tp-result-kicker" id="teen-patti-result-title">
          Round {round.round_number} · {won ? "You won" : "Result"}
        </p>
        <h3 className="tp-result-title">{result.winning_option.name}</h3>
        <p className="tp-result-cat">
          {winningHand ? handCategoryLabel(winningHand.category) : "Highest hand"}
        </p>

        {topWinners.length > 0 && (
          <div className="tp-result-winners">
            <span className="tp-result-winners__label">Top winners</span>
            <ol className="result-leaderboard">
              {topWinners.map((topWinner) => {
                const isCurrentPlayer = topWinner.user_id === snapshot.wallet.user_id;
                return (
                  <li
                    key={topWinner.user_id}
                    className={`result-leaderboard__row result-leaderboard__row--${topWinner.rank}`}
                  >
                    <span
                      className="result-leaderboard__rank"
                      aria-label={`Rank ${topWinner.rank}`}
                    >
                      <Crown aria-hidden="true" />
                      <b>{topWinner.rank}</b>
                    </span>
                    <PlayerAvatar player={topWinner} className="result-leaderboard__avatar" />
                    <span className="result-leaderboard__player">
                      <strong>
                        {teenPattiPlayerName(topWinner)}
                        {isCurrentPlayer ? " (You)" : ""}
                      </strong>
                      <small>
                        {formatInteger(topWinner.winning_stake)} winning stake
                        {" · "}
                        {topWinner.bet_count}{" "}
                        {topWinner.bet_count === 1 ? "bet" : "bets"}
                      </small>
                    </span>
                    <b className="result-leaderboard__payout">
                      <span className="game-gem" aria-hidden="true">{currencySymbol}</span>
                      {formatInteger(topWinner.total_payout)}
                    </b>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="tp-result-hands">
          {result.hands?.map((hand) => (
            <div
              key={hand.option_id}
              className={clsx(
                "tp-result-hand",
                hand.option_id === winnerId && "tp-result-hand--winner",
              )}
            >
              <span className="tp-result-hand__name">
                {snapshot.round?.options.find((deck) => deck.id === hand.option_id)?.name ?? hand.option_code}
              </span>
              <span className="tp-result-hand__cards">
                {hand.cards.map((code, index) => (
                  <PlayingCard
                    key={`${hand.option_id}-${index}`}
                    code={code}
                    faceUp
                    size="sm"
                  />
                ))}
              </span>
              <span className="tp-result-hand__cat">{handCategoryLabel(hand.category)}</span>
            </div>
          ))}
        </div>

        <div className="tp-result-summary">
          <div>
            <span>Stake</span>
            <strong>
              <b aria-hidden="true">{currencySymbol}</b>
              {formatInteger(stake.toString())}
            </strong>
          </div>
          <div className={clsx(won && "tp-result-summary__win")}>
            <span>Payout</span>
            <strong aria-live="polite">
              {payoutPending ? (
                <em className="tp-result-summary__pending">Settling…</em>
              ) : (
                <>
                  <b aria-hidden="true">{currencySymbol}</b>
                  {formatInteger(payout.toString())}
                </>
              )}
            </strong>
          </div>
        </div>

        <p className="tp-result-outcome">{kicker}</p>
      </section>
    </div>
  );
}
