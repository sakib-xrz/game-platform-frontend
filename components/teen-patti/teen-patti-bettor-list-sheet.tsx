"use client";

import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { formatInteger } from "@/lib/format";
import { teenPattiPlayerName } from "@/lib/teen-patti-player-display";
import type { PublicBetAggregate, PublicDeck } from "@/types/teen-patti";

type DisplayBettor = PublicBetAggregate & { handCount: number };

function aggregateTablePlayers(bettors: PublicBetAggregate[]): DisplayBettor[] {
  const players = new Map<string, DisplayBettor>();

  for (const bettor of bettors) {
    const current = players.get(bettor.user_id);
    if (!current) {
      players.set(bettor.user_id, { ...bettor, handCount: 1 });
      continue;
    }
    const bettorIsNewer = Date.parse(bettor.last_bet_at) > Date.parse(current.last_bet_at);
    players.set(bettor.user_id, {
      ...current,
      display_name: bettor.display_name ?? current.display_name,
      avatar_url: bettor.avatar_url ?? current.avatar_url,
      total_amount: (BigInt(current.total_amount) + BigInt(bettor.total_amount)).toString(),
      bet_count: current.bet_count + bettor.bet_count,
      first_bet_at: Date.parse(bettor.first_bet_at) < Date.parse(current.first_bet_at)
        ? bettor.first_bet_at
        : current.first_bet_at,
      last_bet_at: bettorIsNewer ? bettor.last_bet_at : current.last_bet_at,
      handCount: current.handCount + 1,
    });
  }

  return Array.from(players.values()).sort(
    (left, right) => Date.parse(right.last_bet_at) - Date.parse(left.last_bet_at),
  );
}

export function TeenPattiBettorListSheet({
  deck,
  bettors,
  open,
  onClose,
}: {
  deck: PublicDeck | null;
  bettors: PublicBetAggregate[];
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const onCloseRef = useRef(onClose);
  const displayedBettors = useMemo(
    () => deck
      ? bettors.map((bettor) => ({ ...bettor, handCount: 1 }))
      : aggregateTablePlayers(bettors),
    [bettors, deck],
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  if (!open) return null;

  const totalStake = displayedBettors.reduce(
    (total, bettor) => total + BigInt(bettor.total_amount),
    0n,
  );
  const title = deck ? `${deck.name} bettors` : "Live table players";

  return (
    <div
      className="bettor-sheet-backdrop tp-bettor-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teen-patti-bettor-sheet-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="bettor-sheet tp-bettor-sheet">
        <div className="bettor-sheet__handle" aria-hidden="true" />
        <div className="bettor-sheet__header">
          <div>
            <span>
              {displayedBettors.length} {displayedBettors.length === 1 ? "player" : "players"}
            </span>
            <h2 id="teen-patti-bettor-sheet-title">{title}</h2>
            <p><span aria-hidden="true">◆</span>{formatInteger(totalStake.toString())} total</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Close ${title}`}>
            <X aria-hidden="true" />
          </button>
        </div>

        <ol
          ref={listRef}
          className="bettor-sheet__list"
          tabIndex={0}
          aria-label={`${title}, sorted by most recent bet`}
        >
          {displayedBettors.map((bettor) => (
            <li key={bettor.user_id}>
              <PlayerAvatar player={bettor} className="bettor-sheet__avatar" />
              <div>
                <strong>{teenPattiPlayerName(bettor)}</strong>
                <span>
                  {bettor.bet_count} {bettor.bet_count === 1 ? "bet" : "bets"}
                  {!deck && bettor.handCount > 1 ? ` · ${bettor.handCount} hands` : ""}
                </span>
              </div>
              <b><span aria-hidden="true">◆</span>{formatInteger(bettor.total_amount)}</b>
            </li>
          ))}
          {!displayedBettors.length && (
            <li className="tp-bettor-sheet__empty">No bets have landed in this round yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}
