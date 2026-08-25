"use client";

import { Users } from "lucide-react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import type { BetLanding } from "@/hooks/use-greedy-game";
import { Lucky77Symbol, lucky77DisplayName } from "@/lib/lucky-77-art";
import { formatCompactAmount, formatMultiplier } from "@/lib/format";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

export function Lucky77OptionCard({
  option,
  bettors,
  totalAmount,
  myBet,
  selected,
  locked,
  disabled,
  busy,
  winner,
  landings = [],
  onBet,
  onViewBettors,
}: {
  option: PublicOption;
  bettors: PublicBetAggregate[];
  totalAmount: bigint;
  myBet: bigint;
  selected: boolean;
  locked: boolean;
  disabled: boolean;
  busy: boolean;
  winner: boolean;
  landings?: BetLanding[];
  onBet: () => void;
  onViewBettors: () => void;
}) {
  const name = lucky77DisplayName(option.code, option.name);
  const multiplier = option.payout_multiplier || formatMultiplier(
    option.payout_numerator,
    option.payout_denominator,
  );
  const pileCount = Math.min(9, Math.max(0, bettors.reduce(
    (sum, bettor) => sum + bettor.bet_count,
    0,
  )));
  const playerCount = bettors.length;

  return (
    <article
      className={`l77-option${selected ? " is-selected" : ""}${winner ? " is-winner" : ""}${locked ? " is-locked" : ""}`}
    >
      <span className="l77-option__surface" aria-hidden="true" />
      <div className="l77-option__header">
        <span className="l77-option__total" title={`Total bets: ${totalAmount}`}>
          <small>Pool</small>
          <b>{formatCompactAmount(totalAmount)}</b>
        </span>
        <button
          type="button"
          className="l77-option__players"
          onClick={onViewBettors}
          disabled={playerCount === 0}
          aria-label={`View ${playerCount} ${name} ${playerCount === 1 ? "bettor" : "bettors"}`}
        >
          <span className="l77-option__avatars" aria-hidden="true">
            {bettors.slice(0, 3).map((bettor) => (
              <PlayerAvatar key={bettor.user_id} player={bettor} />
            ))}
          </span>
          {playerCount === 0 ? (
            <Users className="l77-option__players-icon" aria-hidden="true" />
          ) : null}
          <b>{playerCount}</b>
        </button>
      </div>

      <button
        type="button"
        className="l77-option__bet"
        disabled={disabled || locked}
        onClick={onBet}
        aria-label={`Bet on ${name} at ${multiplier}${selected ? `, your stake ${myBet}` : ""}`}
        aria-busy={busy || undefined}
      >
        <span className="l77-option__name">{name}</span>
        <span className="l77-option__art">
          <Lucky77Symbol code={option.code} imageUrl={option.image_url} />
          <span className="l77-option__pile" aria-hidden="true">
            {Array.from({ length: pileCount }, (_, index) => (
              <i key={index} style={{ "--coin-index": index } as React.CSSProperties} />
            ))}
          </span>
          {landings.slice(-6).map((landing, index) => (
            <i
              key={landing.id}
              className={`l77-option__flying-coin${landing.isMine ? " is-mine" : ""}`}
              style={{
                "--landing-index": index,
                "--landing-drift": `${(index % 3 - 1) * 18}px`,
              } as React.CSSProperties}
              aria-hidden="true"
            >
              {landing.amount ? <span>+{formatCompactAmount(landing.amount)}</span> : null}
            </i>
          ))}
        </span>
        <strong><small>Pays</small>{multiplier.toUpperCase()}</strong>
        {busy ? <span className="l77-option__busy" aria-hidden="true" /> : null}
      </button>

      {winner ? (
        <span className="l77-option__ribbon">{selected ? "YOU WIN" : "WINNER"}</span>
      ) : selected ? (
        <span className="l77-option__ribbon">YOUR PICK · {formatCompactAmount(myBet)}</span>
      ) : locked ? (
        <span className="l77-option__ribbon l77-option__ribbon--muted">ONE PICK ONLY</span>
      ) : null}
    </article>
  );
}
