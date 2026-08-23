"use client";

import clsx from "clsx";
import { useEffect, useId, useRef } from "react";
import { Crown, X } from "lucide-react";
import { PlayingCard } from "@/components/teen-patti/playing-card";
import { formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import type { DealtHand, RecentRound } from "@/types/teen-patti";

const DEFAULT_HAND_NAMES: Record<string, string> = {
  DECK_A: "Hand 1",
  DECK_B: "Hand 2",
  DECK_C: "Hand 3",
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function displayHandName(
  hand: DealtHand,
  winnerId: string | undefined,
  winnerName: string | undefined,
): string {
  if (hand.option_id === winnerId && winnerName) return winnerName;
  return DEFAULT_HAND_NAMES[hand.option_code.toUpperCase()]
    ?? hand.option_code.replaceAll("_", " ");
}

export function TeenPattiHistorySheet({
  round,
  open,
  onClose,
}: {
  round: RecentRound | null;
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sheet.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sheet.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  const result = round?.result ?? null;
  const hands = result?.hands ?? [];
  const winnerId = result?.winning_option.id;
  const winnerName = result?.winning_option.name;
  const winningHand = hands.find((hand) => hand.option_id === winnerId);
  const roundLabel = round ? `Round ${round.round_number}` : "Round details";

  return (
    <div
      className="tp-history-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section ref={sheetRef} className="tp-history-sheet">
        <span className="tp-history-sheet__handle" aria-hidden="true" />
        <header className="tp-history-sheet__header">
          <div>
            <span>Completed game</span>
            <h2 id={titleId}>{roundLabel}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${roundLabel}`}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div
          className="tp-history-sheet__scroll"
          tabIndex={0}
          aria-label={`${roundLabel} result details`}
        >
          {round ? (
            <>
              <section
                className={clsx(
                  "tp-history-sheet__winner",
                  !result && "tp-history-sheet__winner--empty",
                )}
                aria-label={result ? `Winning hand: ${winnerName}` : "Winning hand unavailable"}
              >
                <span className="tp-history-sheet__winner-icon" aria-hidden="true">
                  <Crown />
                </span>
                <div>
                  <span>Winning hand</span>
                  <h3>{winnerName ?? "Result unavailable"}</h3>
                  <p>
                    {winningHand
                      ? handCategoryLabel(winningHand.category)
                      : result
                        ? "Highest hand"
                        : "No completed result was returned for this round."}
                  </p>
                </div>
              </section>

              <section className="tp-history-sheet__hands" aria-labelledby={`${titleId}-hands`}>
                <div className="tp-history-sheet__section-heading">
                  <span aria-hidden="true">♠</span>
                  <h3 id={`${titleId}-hands`}>Dealt hands</h3>
                  <span aria-hidden="true">♥</span>
                </div>

                {hands.length ? (
                  <div className="tp-history-sheet__hand-grid">
                    {hands.map((hand) => {
                      const winner = hand.option_id === winnerId;
                      const handName = displayHandName(hand, winnerId, winnerName);
                      return (
                        <article
                          key={hand.option_id}
                          className={clsx(
                            "tp-history-sheet__hand",
                            winner && "tp-history-sheet__hand--winner",
                          )}
                          aria-label={`${handName}, ${handCategoryLabel(hand.category)}${winner ? ", winner" : ""}`}
                        >
                          <span className="tp-history-sheet__hand-name">
                            {winner && <Crown aria-hidden="true" />}
                            {handName}
                          </span>
                          <span className="tp-history-sheet__cards">
                            {hand.cards.map((code, index) => (
                              <PlayingCard
                                key={`${hand.option_id}-${index}`}
                                code={code}
                                faceUp
                                size="sm"
                              />
                            ))}
                          </span>
                          <span className="tp-history-sheet__category">
                            {handCategoryLabel(hand.category)}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="tp-history-sheet__empty">
                    Dealt-card details are not available for this round.
                  </p>
                )}
              </section>

              <dl className="tp-history-sheet__totals" id={descriptionId}>
                <div>
                  <dt>Total bet</dt>
                  <dd><span aria-hidden="true">◆</span>{formatInteger(round.total_bet_amount)}</dd>
                </div>
                <div className="tp-history-sheet__total-payout">
                  <dt>Total payout</dt>
                  <dd><span aria-hidden="true">◆</span>{formatInteger(round.total_payout_amount)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="tp-history-sheet__missing" id={descriptionId}>
              <span aria-hidden="true">♠</span>
              <h3>Round unavailable</h3>
              <p>This history entry could not be loaded. Close the sheet and try again.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
