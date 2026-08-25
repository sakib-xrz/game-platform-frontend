"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { Lucky77Symbol, lucky77DisplayName } from "@/lib/lucky-77-art";
import { formatInteger } from "@/lib/format";
import { playerDisplayName } from "@/lib/player-display";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

export function Lucky77BettorSheet({
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !option) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open, option]);

  if (!open || !option) return null;
  const total = bettors.reduce(
    (sum, bettor) => sum + BigInt(bettor.total_amount),
    0n,
  );

  return (
    <div
      className="l77-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="l77-bettors-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="l77-bettor-sheet">
        <span className="l77-bettor-sheet__handle" aria-hidden="true" />
        <header>
          <Lucky77Symbol code={option.code} imageUrl={option.image_url} />
          <div>
            <small>{bettors.length} live {bettors.length === 1 ? "player" : "players"}</small>
            <h2 id="l77-bettors-title">{lucky77DisplayName(option.code, option.name)} bets</h2>
            <p><span aria-hidden="true">◆</span>{formatInteger(total)} total coins</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close bettor list">
            <X aria-hidden="true" />
          </button>
        </header>
        <ol>
          {bettors.map((bettor) => (
            <li key={bettor.user_id}>
              <PlayerAvatar player={bettor} className="l77-bettor-sheet__avatar" />
              <span>
                <strong>{playerDisplayName(bettor)}</strong>
                <small>{bettor.bet_count} {bettor.bet_count === 1 ? "coin" : "coins"} placed</small>
              </span>
              <b>{formatInteger(bettor.total_amount)}</b>
            </li>
          ))}
          {bettors.length === 0 ? <li className="is-empty">No bets yet.</li> : null}
        </ol>
      </section>
    </div>
  );
}
