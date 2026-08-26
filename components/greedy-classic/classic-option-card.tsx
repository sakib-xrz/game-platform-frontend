"use client";

import clsx from "clsx";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import {
  ClassicOptionArtwork,
  getClassicOptionDisplayName,
} from "@/lib/greedy-classic-art";
import {
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
}) {
  const hasBet = BigInt(myBet || "0") > 0n;
  const multiplier = multiplierFor(option);
  const displayName = getClassicOptionDisplayName(
    option.code,
    option.name,
    option.image_url,
  );
  const visibleBettors = bettors.slice(0, 3);
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
            You <b>{formatInteger(myBet)}</b>
          </span>
        ) : null}
      </button>

      {visibleBettors.length > 0 ? (
        <span className="gc-option__bettors" aria-hidden="true">
          {visibleBettors.map((bettor) => (
            <PlayerAvatar
              key={bettor.user_id}
              player={bettor}
              className="gc-option__bettor-avatar"
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
