"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { formatInteger } from "@/lib/format";
import { getClassicOptionDisplayName } from "@/lib/greedy-classic-art";
import { playerDisplayName } from "@/lib/player-display";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

export function ClassicBettorSheet({
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

    const previousFocus = document.activeElement instanceof HTMLElement
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
      previousFocus?.focus();
    };
  }, [open, option]);

  if (!open || !option) return null;

  const displayName = getClassicOptionDisplayName(
    option.code,
    option.name,
    option.image_url,
  );
  const totalStake = bettors.reduce(
    (total, bettor) => total + BigInt(bettor.total_amount),
    0n,
  );

  return (
    <div
      className="gc-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gc-bettor-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="gc-sheet gc-bettor-sheet">
        <div className="gc-sheet__handle" aria-hidden="true" />
        <header className="gc-sheet__header">
          <div>
            <span>{bettors.length} {bettors.length === 1 ? "player" : "players"}</span>
            <h2 id="gc-bettor-title">{displayName} bets</h2>
            <p>{formatInteger(totalStake)} total coins</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="gc-sheet__close"
            onClick={onClose}
            aria-label={`Close ${displayName} bettor list`}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <ol
          ref={listRef}
          className="gc-bettor-sheet__list"
          tabIndex={0}
          aria-label={`${displayName} bettors, sorted by most recent bet`}
        >
          {bettors.map((bettor) => (
            <li key={bettor.user_id}>
              <PlayerAvatar player={bettor} className="gc-bettor-sheet__avatar" />
              <div>
                <strong>{playerDisplayName(bettor)}</strong>
                <span>{bettor.bet_count} {bettor.bet_count === 1 ? "bet" : "bets"}</span>
              </div>
              <b>{formatInteger(bettor.total_amount)}</b>
            </li>
          ))}
          {bettors.length === 0 ? (
            <li className="gc-bettor-sheet__empty">No bets on this item yet.</li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}

