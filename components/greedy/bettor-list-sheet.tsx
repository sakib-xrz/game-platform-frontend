"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatInteger } from "@/lib/format";
import { getOptionDisplayName } from "@/lib/option-art";
import { playerDisplayName } from "@/lib/player-display";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

export function BettorListSheet({
  option,
  bettors,
  open,
  onClose,
}: {
  option: PublicOption | null;
  bettors: PublicBetAggregate[];
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !option) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === closeButtonRef.current) {
          event.preventDefault();
          listRef.current?.focus();
        } else if (!event.shiftKey && document.activeElement === listRef.current) {
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
      previouslyFocused?.focus();
    };
  }, [open, option]);

  if (!open || !option) return null;

  const displayName = getOptionDisplayName(option.code, option.name);
  const totalStake = bettors.reduce(
    (total, bettor) => total + BigInt(bettor.total_amount),
    0n,
  );

  return (
    <div
      className="bettor-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bettor-sheet-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="bettor-sheet">
        <div className="bettor-sheet__handle" aria-hidden="true" />
        <div className="bettor-sheet__header">
          <div>
            <span>{bettors.length} {bettors.length === 1 ? "player" : "players"}</span>
            <h2 id="bettor-sheet-title">{displayName} bets</h2>
            <p><span className="game-gem" aria-hidden="true">◆</span>{formatInteger(totalStake.toString())} total</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${displayName} bettor list`}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <ol
          ref={listRef}
          className="bettor-sheet__list"
          tabIndex={0}
          aria-label={`${displayName} bettors, sorted by most recent bet`}
        >
          {bettors.map((bettor) => (
            <li key={bettor.user_id}>
              <PlayerAvatar player={bettor} className="bettor-sheet__avatar" />
              <div>
                <strong>{playerDisplayName(bettor)}</strong>
                <span>{bettor.bet_count} {bettor.bet_count === 1 ? "coin placed" : "coins placed"}</span>
              </div>
              <b><span className="game-gem" aria-hidden="true">◆</span>{formatInteger(bettor.total_amount)}</b>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
