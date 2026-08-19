"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import { PlayingCard } from "@/components/teen-patti/playing-card";
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !result) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, result, onClose]);

  if (!open || !round || !result) return null;

  const stake = snapshot.my_bets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n);
  const payout = snapshot.my_bets.reduce(
    (sum, bet) => sum + BigInt(bet.settlement?.payout_amount ?? "0"),
    0n,
  );
  const winnerId = result.winning_option.id;
  const winningBet = snapshot.my_bets.some((bet) => bet.option.id === winnerId);
  const winningHand = result.hands?.find((hand) => hand.option_id === winnerId);

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
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="tp-result-close"
          aria-label="Close result"
        >
          <X aria-hidden="true" />
        </button>

        <p className="tp-result-kicker" id="teen-patti-result-title">
          Round {round.round_number} · {won ? "You won" : "Result"}
        </p>
        <h3 className="tp-result-title">{result.winning_option.name}</h3>
        <p className="tp-result-cat">
          {winningHand ? handCategoryLabel(winningHand.category) : "Highest hand"}
        </p>

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
              <b aria-hidden="true">●</b>
              {formatInteger(stake.toString())}
            </strong>
          </div>
          <div className={clsx(won && "tp-result-summary__win")}>
            <span>Payout</span>
            <strong>
              <b aria-hidden="true">●</b>
              {formatInteger(payout.toString())}
            </strong>
          </div>
        </div>

        <p className="tp-result-outcome">{kicker}</p>
      </section>
    </div>
  );
}
