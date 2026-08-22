"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { getOptionDisplayName, OptionArtwork } from "@/lib/option-art";
import { formatInteger } from "@/lib/format";
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
    const stake = snapshot.my_bets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n);
    const payout = snapshot.my_bets.reduce((sum, bet) => sum + BigInt(bet.settlement?.payout_amount ?? "0"), 0n);
    return { stake, payout };
  }, [snapshot.my_bets]);

  if (!open || !round || !result) return null;

  const secondsLeft = clock.roundId === round.id
    ? Math.max(0, Math.ceil((clock.deadline - clock.now) / 1000))
    : Math.ceil(displayMs / 1000);
  const winner = result.winning_option;
  const winnerName = getOptionDisplayName(winner.code, winner.name);
  const winningBet = snapshot.my_bets.some((bet) => bet.option.id === winner.id);
  const payoutPending = snapshot.my_bets.some((bet) => !bet.settlement)
    && (round.status === "result_revealed" || round.status === "settling");
  const payoutLabel = payoutPending ? "Settling…" : formatInteger(totals.payout);
  const outcome = totals.stake === 0n ? "No selection this round" : winningBet ? "You picked the winner!" : "Better luck next round";

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

        <div className="result-card">
          <p className="result-card__line">
            The <em>{round.round_number}</em> round&apos;s result:
            <span className="result-card__inline-art">
              <OptionArtwork imageUrl={winner.image_url} code={winner.code} name={winnerName} className="result-card__inline-image" />
            </span>
          </p>
          <p className="result-card__line">
            This round&apos;s winnings: <span className="game-gem" aria-hidden="true">◆</span>
            <strong aria-live="polite">{payoutLabel}</strong>
          </p>
          <p className="result-card__line">
            Your selection this round: <span className="game-coin game-coin--inline" aria-hidden="true" /> <strong>{formatInteger(totals.stake)}</strong>
          </p>

          <div className="result-card__divider"><span>Your result</span></div>

          <div className="result-card__player">
            <div className="result-card__avatar">
              <OptionArtwork imageUrl={winner.image_url} code={winner.code} name={winnerName} className="result-card__avatar-image" />
              <small>You</small>
            </div>
            <div>
              <strong>{outcome}</strong>
              <span><span className="game-gem" aria-hidden="true">◆</span>{payoutLabel}</span>
            </div>
          </div>

          <p className="result-card__note">The public winner and your payout are verified by the game server.</p>
        </div>
      </section>
    </div>
  );
}
