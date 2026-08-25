"use client";

import { Crown, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { Lucky77Symbol, lucky77DisplayName } from "@/lib/lucky-77-art";
import { formatCompactAmount, formatInteger, multiplyRational } from "@/lib/format";
import { playerDisplayName } from "@/lib/player-display";
import type { GreedySnapshot } from "@/types/greedy";

export function Lucky77ResultModal({
  snapshot,
  open,
  onClose,
}: {
  snapshot: GreedySnapshot;
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const round = snapshot.round;
  const result = round?.result;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);

  const playerResult = useMemo(() => {
    if (!round || !result) return { stake: 0n, winningStake: 0n, payout: 0n };
    const bets = snapshot.my_bets.filter((bet) => bet.round_id === round.id);
    const stake = bets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n);
    const winningBets = bets.filter(
      (bet) => bet.option.id === result.winning_option.id,
    );
    const winningStake = winningBets.reduce(
      (sum, bet) => sum + BigInt(bet.amount),
      0n,
    );
    const podiumPayout = result.top_winners?.find(
      (winner) => winner.user_id === snapshot.wallet.user_id,
    )?.total_payout;
    const payout = podiumPayout
      ? BigInt(podiumPayout)
      : BigInt(
          multiplyRational(
            winningStake.toString(),
            result.winning_option.payout_numerator,
            result.winning_option.payout_denominator,
          ),
        );
    return { stake, winningStake, payout };
  }, [result, round, snapshot.my_bets, snapshot.wallet.user_id]);

  if (!open || !round || !result) return null;

  const winner = result.winning_option;
  const topWinners = [...(result.top_winners ?? [])]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 3);
  const hasWon = playerResult.winningStake > 0n;

  return (
    <div
      className="l77-settlement-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="l77-settlement-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="l77-settlement">
        <header className="l77-settlement__header">
          <div className="l77-settlement__badge">
            <span>Settlement</span>
          </div>
          <h2 id="l77-settlement-title">Winners ranking in this round</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close settlement"
            className="l77-settlement__close"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <ol className="l77-podium">
          {[0, 1, 2].map((index) => {
            const podiumWinner = topWinners[index];
            return (
              <li key={podiumWinner?.user_id ?? `empty-${index}`} className={`is-rank-${index + 1}`}>
                <span className="l77-podium__crown-wrapper">
                  <Crown aria-hidden="true" />
                </span>
                {podiumWinner ? (
                  <>
                    <PlayerAvatar player={podiumWinner} className="l77-podium__avatar" />
                    <strong>{playerDisplayName(podiumWinner)}</strong>
                    <span>Bet {formatCompactAmount(podiumWinner.winning_stake)}</span>
                    <b>Win {formatCompactAmount(podiumWinner.total_payout)}</b>
                  </>
                ) : (
                  <>
                    <span className="l77-podium__empty">?</span>
                    <strong>No winner</strong>
                    <span>Bet 0</span>
                    <b>Win 0</b>
                  </>
                )}
              </li>
            );
          })}
        </ol>

        <div className={`l77-my-result${hasWon ? " is-win" : ""}`}>
          <span className="l77-my-result__symbol">
            <Lucky77Symbol code={winner.code} imageUrl={winner.image_url} />
          </span>
          <div className="l77-my-result__info">
            <strong>{hasWon ? "You won" : lucky77DisplayName(winner.code, winner.name)}</strong>
            <small>{hasWon ? "Winning selection" : playerResult.stake > 0n ? "Better luck next round" : "No bet this round"}</small>
          </div>
          <dl className="l77-my-result__stats">
            <div><dt>Bet</dt><dd>{formatInteger(playerResult.stake)}</dd></div>
            <div><dt>Win</dt><dd>{formatInteger(playerResult.payout)}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  );
}
