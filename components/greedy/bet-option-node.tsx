"use client";

import clsx from "clsx";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { getOptionDisplayName, OptionArtwork } from "@/lib/option-art";
import { formatCompactAmount, formatInteger, formatMultiplier } from "@/lib/format";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

function optionMultiplier(option: PublicOption): string {
  if (option.payout_multiplier) return option.payout_multiplier;
  return formatMultiplier(option.payout_numerator, option.payout_denominator);
}

export function BetOptionNode({
  option,
  left,
  top,
  bettorPlacement,
  myBet,
  winner,
  drawingHighlighted,
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
  bettorPlacement: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
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
  const multiplier = optionMultiplier(option);
  const displayName = getOptionDisplayName(option.code, option.name);
  const accessibilityDetails = [
    hasBet ? `your bet is ${formatInteger(myBet)} coins` : null,
    winner
      ? "winning option"
      : drawingHighlighted
        ? "currently highlighted during the draw"
        : null,
    disabled ? "betting unavailable" : null,
    busy ? "bet confirmation in progress" : null,
    bettors.length
      ? `${bettors.length} ${bettors.length === 1 ? "player has" : "players have"} selected this option`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  const visibleBettors = bettors.slice(0, 2);
  const hiddenBettors = Math.max(0, bettors.length - visibleBettors.length);

  return (
    <div
      className={clsx(
        "option-node-wrap",
        winner && "option-node--winner",
        drawingHighlighted && "option-node--drawing-highlight",
        hasBet && "option-node--has-bet",
        busy && !disabled && "option-node--busy",
      )}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        zIndex: drawingHighlighted ? 35 : winner ? 26 : hasBet ? 25 : 20,
      }}
    >
      <button
        type="button"
        className="option-node"
        onClick={onPress}
        disabled={disabled}
        aria-label={`Bet on ${displayName}, ${multiplier}${accessibilityDetails ? `; ${accessibilityDetails}` : ""}`}
      >
        {winner && <span className="option-node__badge">Win</span>}

        {landingIds.map((landingId, index) => (
          <span
            key={landingId}
            className={`option-node__coin-landing option-node__coin-landing--${index % 3}`}
            aria-hidden="true"
          >
            <i className="game-coin" />
          </span>
        ))}

        <span className="option-node__surface" aria-hidden="true">
          <span className="option-node__art-half">
            <OptionArtwork
              imageUrl={option.image_url}
              code={option.code}
              name={displayName}
              className="option-node__art"
            />
            {hasBet && (
              <span className="option-node__my-bet">
                You:<span className="game-gem">◆</span>
                {formatInteger(myBet)}
              </span>
            )}
          </span>

          <span className="option-node__payout-half">
            <span className="option-node__multiplier">{multiplier}</span>
          </span>
        </span>
      </button>

      {bettors.length > 0 && (
        <button
          type="button"
          className={`option-node__bettors option-node__bettors--${bettorPlacement}`}
          onClick={onViewBettors}
          aria-label={`View all ${bettors.length} ${displayName} ${bettors.length === 1 ? "bettor" : "bettors"}`}
        >
          {visibleBettors.map((bettor) => (
            <span className="option-node__bettor" key={bettor.user_id}>
              <PlayerAvatar player={bettor} />
              <b>{formatCompactAmount(bettor.total_amount)}</b>
            </span>
          ))}
          {hiddenBettors > 0 && (
            <span className="option-node__bettor-more">+{hiddenBettors}</span>
          )}
        </button>
      )}
    </div>
  );
}
