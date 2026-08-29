"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { BettorAvatarScatter } from "@/components/greedy/bettor-avatar-scatter";
import type { BetLanding } from "@/hooks/use-greedy-game";
import { getChipThemeForAmount } from "@/lib/chip-themes";
import { Lucky77Symbol, lucky77DisplayName } from "@/lib/lucky-77-art";
import { LUCKY77_AVATAR_BOUNDS } from "@/lib/bettor-avatar-layout";
import { formatCompactAmount, formatMultiplier } from "@/lib/format";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

export function Lucky77OptionCard({
  option,
  optionIndex = 0,
  bettors,
  myBet,
  selected,
  locked,
  disabled,
  busy,
  winner,
  landings = [],
  onBet,
}: {
  option: PublicOption;
  optionIndex?: number;
  bettors: PublicBetAggregate[];
  myBet: bigint;
  selected: boolean;
  locked: boolean;
  disabled: boolean;
  busy: boolean;
  winner: boolean;
  landings?: BetLanding[];
  onBet: () => void;
}) {
  const name = lucky77DisplayName(option.code, option.name);
  const multiplier =
    option.payout_multiplier ||
    formatMultiplier(option.payout_numerator, option.payout_denominator);
  const pileCount = Math.min(
    9,
    Math.max(
      0,
      bettors.reduce((sum, bettor) => sum + bettor.bet_count, 0),
    ),
  );

  return (
    <article
      className={clsx(
        "l77-option",
        selected && "is-selected",
        winner && "is-winner",
        locked && "is-locked",
        busy && "is-busy",
        landings.length > 0 && "l77-option--flying-landing",
      )}
      style={
        {
          zIndex: landings.length > 0 ? 80 : winner ? 30 : selected ? 20 : 10,
        } as CSSProperties
      }
    >
      <span className="l77-option__surface" aria-hidden="true" />
      <div className="l77-option__header">
        <BettorAvatarScatter
          optionId={option.id}
          bettors={bettors}
          bounds={LUCKY77_AVATAR_BOUNDS}
          containerClassName="l77-option__bettors"
          avatarClassName="l77-option__bettor-avatar"
          slotClassName="l77-option__bettor-slot"
        />
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
              <i
                key={index}
                style={{ "--coin-index": index } as React.CSSProperties}
              />
            ))}
          </span>
          {landings.map((landing, index) => {
            const theme = getChipThemeForAmount(landing.amount, index);
            const isBot = !landing.isMine;
            // Target X center of option card relative to container:
            // optionIndex 0: ~18.23cqw, optionIndex 1: 50.0cqw, optionIndex 2: ~81.77cqw
            const targetX = optionIndex === 0 ? 18.23 : optionIndex === 2 ? 81.77 : 50.0;
            // Bot bet: flow from top-right player counter icon (Users icon with player badge in toolbar)
            // Toolbar height + padding puts the center of the player icon at ~91.8cqw X and ~6.8cqw Y from top of screen.
            // Option card center is at ~106.5cqw Y from top of screen.
            // Therefore sourceY relative to option card center is -(106.5 - 6.8)cqw = -99.7cqw.
            // Player's own bet: flow from bottom chip tray (~50.0cqw X, ~ +35.0cqw Y)
            const sourceX = isBot ? 91.8 : 50.0;
            const sourceY = isBot ? -99.7 : 35.0;
            const flyDx = sourceX - targetX;
            const flyDy = sourceY;
            const jitterX = ((index % 3) - 1) * 2.2;

            return (
              <span
                key={landing.id}
                className="l77-option__flying-coin"
                style={
                  {
                    "--chip-rim": theme.rim,
                    "--chip-core": theme.core,
                    "--chip-ink": theme.ink,
                    "--fly-dx": `${flyDx.toFixed(2)}cqw`,
                    "--fly-dy": `${flyDy.toFixed(2)}cqw`,
                    "--landing-x": `${jitterX.toFixed(2)}cqw`,
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                <span className="player-avatar__coin">
                  <span className="player-avatar__coin-rim" />
                  <span className="player-avatar__coin-core" />
                </span>
              </span>
            );
          })}
        </span>
        <strong>
          <small>Pays</small>
          {multiplier.toUpperCase()}
        </strong>
        {busy ? (
          <span className="l77-option__busy" aria-hidden="true">
            <span className="l77-option__busy-spinner" />
          </span>
        ) : null}
      </button>

      {winner ? (
        <span className="l77-option__ribbon">
          {selected ? "YOU WIN" : "WINNER"}
        </span>
      ) : selected ? (
        <span className="l77-option__ribbon">
          YOUR PICK · {formatCompactAmount(myBet)}
        </span>
      ) : locked ? (
        <span className="l77-option__ribbon l77-option__ribbon--muted">
          ONE PICK ONLY
        </span>
      ) : null}
    </article>
  );
}
