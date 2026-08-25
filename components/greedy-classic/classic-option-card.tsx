"use client";

import clsx from "clsx";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import {
  ClassicOptionArtwork,
  getClassicOptionDisplayName,
} from "@/lib/greedy-classic-art";
import {
  formatCompactAmount,
  formatInteger,
  formatMultiplier,
} from "@/lib/format";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

function multiplierFor(option: PublicOption): string {
  return option.payout_multiplier
    || formatMultiplier(option.payout_numerator, option.payout_denominator);
}

export function ClassicOptionCard({
  option,
  left,
  top,
  myBet,
  winner,
  drawingHighlighted = false,
  disabled,
  busy,
  bettors,
  landingIds,
  onPress,
  onViewBettors,
}: {
  option: PublicOption;
  left: number;
  top: number;
  myBet: string;
  winner: boolean;
  drawingHighlighted?: boolean;
  disabled: boolean;
  busy: boolean;
  bettors: PublicBetAggregate[];
  landingIds: string[];
  onPress: () => void;
  onViewBettors: () => void;
}) {
  const hasBet = BigInt(myBet || "0") > 0n;
  const multiplier = multiplierFor(option);
  const displayName = getClassicOptionDisplayName(
    option.code,
    option.name,
    option.image_url,
  );
  const visibleBettors = bettors.slice(0, 2);
  const hiddenBettors = Math.max(0, bettors.length - visibleBettors.length);
  const details = [
    hasBet ? `your bet is ${formatInteger(myBet)} coins` : null,
    winner ? "winning option" : null,
    drawingHighlighted ? "currently highlighted during the draw" : null,
    disabled ? "betting unavailable" : null,
    busy ? "bet confirmation in progress" : null,
    bettors.length
      ? `${bettors.length} ${bettors.length === 1 ? "player has" : "players have"} selected this option`
      : null,
  ].filter(Boolean).join("; ");

  return (
    <div
      className={clsx(
        "gc-option-wrap",
        hasBet && "gc-option-wrap--selected",
        winner && "gc-option-wrap--winner",
        drawingHighlighted && "gc-option-wrap--drawing",
        busy && "gc-option-wrap--busy",
      )}
      style={{
        "--gc-option-left": `${left}%`,
        "--gc-option-top": `${top}%`,
        zIndex: drawingHighlighted ? 30 : winner ? 29 : hasBet ? 20 : 10,
      } as React.CSSProperties}
    >
      <button
        type="button"
        className="gc-option"
        disabled={disabled}
        onClick={onPress}
        aria-label={`Bet on ${displayName}, win ${multiplier}${details ? `; ${details}` : ""}`}
      >
        <span className="gc-option__shine" aria-hidden="true" />
        {winner ? <span className="gc-option__winner-badge">Winner</span> : null}

        {landingIds.map((landingId, index) => (
          <span
            key={landingId}
            className={`gc-option__coin-landing gc-option__coin-landing--${index % 3}`}
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/greedy-classic/silver-token.png" alt="" />
          </span>
        ))}

        <span className="gc-option__art" aria-hidden="true">
          <ClassicOptionArtwork
            imageUrl={option.image_url}
            code={option.code}
            name={displayName}
            className="gc-option__image"
          />
        </span>

        <span className="gc-option__payout">Win {multiplier}</span>
        {hasBet ? (
          <span className="gc-option__mine">
            You <b>{formatCompactAmount(myBet)}</b>
          </span>
        ) : null}
      </button>

      {bettors.length > 0 ? (
        <button
          type="button"
          className="gc-option__bettors"
          onClick={onViewBettors}
          aria-label={`View all ${bettors.length} ${displayName} ${bettors.length === 1 ? "bettor" : "bettors"}`}
        >
          {visibleBettors.map((bettor) => (
            <span className="gc-option__bettor" key={bettor.user_id}>
              <PlayerAvatar player={bettor} />
              <b>{formatCompactAmount(bettor.total_amount)}</b>
            </span>
          ))}
          {hiddenBettors > 0 ? (
            <span className="gc-option__bettor-more">+{hiddenBettors}</span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
