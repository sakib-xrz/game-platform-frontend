"use client";

import clsx from "clsx";
import { getOptionDisplayName, OptionArtwork } from "@/lib/option-art";
import { formatInteger, formatMultiplier } from "@/lib/format";
import type { PublicOption } from "@/types/greedy";

function optionMultiplier(option: PublicOption): string {
  if (option.payout_multiplier) return option.payout_multiplier;
  return formatMultiplier(option.payout_numerator, option.payout_denominator);
}

export function BetOptionNode({
  option,
  left,
  top,
  myBet,
  winner,
  drawingHighlighted,
  disabled,
  busy,
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
  onPress: () => void;
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
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <button
      type="button"
      className={clsx(
        "option-node",
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
      onClick={onPress}
      disabled={disabled || busy}
      aria-label={`Bet on ${displayName}, ${multiplier}${accessibilityDetails ? `; ${accessibilityDetails}` : ""}`}
    >
      {winner && <span className="option-node__badge">Win</span>}

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
  );
}
