"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  ClassicOptionArtwork,
  getClassicOptionDisplayName,
} from "@/lib/greedy-classic-art";
import { formatMultiplier } from "@/lib/format";
import type { RecentRound } from "@/types/greedy";

export function ClassicHistorySheet({
  history,
  open,
  onClose,
}: {
  history: RecentRound[];
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        const lastFocusTarget = listRef.current ?? emptyRef.current;
        if (event.shiftKey && document.activeElement === closeButtonRef.current) {
          event.preventDefault();
          lastFocusTarget?.focus();
        } else if (!event.shiftKey && document.activeElement === lastFocusTarget) {
          event.preventDefault();
          closeButtonRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const rounds = history.filter((round) => round.result?.winning_option).slice(0, 20);

  return (
    <div
      className="gc-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gc-history-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="gc-sheet gc-history-sheet">
        <div className="gc-sheet__handle" aria-hidden="true" />
        <header className="gc-sheet__header">
          <div>
            <span>Verified results</span>
            <h2 id="gc-history-title">Recent rounds</h2>
            <p>The server-published winner for each completed round.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="gc-sheet__close"
            onClick={onClose}
            aria-label="Close recent results"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {rounds.length ? (
          <ol
            ref={listRef}
            className="gc-history-sheet__list"
            tabIndex={0}
            aria-label="Recent verified Greedy Classic results"
          >
            {rounds.map((round, index) => {
              const winner = round.result!.winning_option;
              const winnerName = getClassicOptionDisplayName(
                winner.code,
                winner.name,
                winner.image_url,
              );
              const multiplier = winner.payout_multiplier
                || formatMultiplier(winner.payout_numerator, winner.payout_denominator);
              return (
                <li key={round.id}>
                  <span className="gc-history-sheet__art">
                    <ClassicOptionArtwork
                      imageUrl={winner.image_url}
                      code={winner.code}
                      name={winnerName}
                      className="gc-history-sheet__image"
                    />
                  </span>
                  <span>
                    <small>{index === 0 ? "Latest" : `Round ${round.round_number}`}</small>
                    <strong>{winnerName}</strong>
                  </span>
                  <b>{multiplier}</b>
                </li>
              );
            })}
          </ol>
        ) : (
          <p
            ref={emptyRef}
            className="gc-history-sheet__empty"
            tabIndex={0}
          >
            Results will appear after the first completed draw.
          </p>
        )}
      </section>
    </div>
  );
}
