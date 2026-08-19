"use client";

import clsx from "clsx";
import { OptionArtwork } from "@/lib/option-art";
import { formatInteger, formatMultiplier } from "@/lib/format";
import type { PublicOption } from "@/types/greedy";

function winTimes(numerator: string, denominator: string): string {
  const formatted = formatMultiplier(numerator, denominator);
  return formatted === "—" ? formatted : formatted.replace("×", "");
}

function rewardDots(numerator: string, denominator: string): number {
  const n = Number(numerator);
  const d = Number(denominator);
  const payout = d > 0 ? n / d : 0;
  if (payout >= 18) return 3;
  if (payout >= 9) return 2;
  return 1;
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
  const multiplier = winTimes(
    option.payout_numerator,
    option.payout_denominator,
  );
  const dots = rewardDots(option.payout_numerator, option.payout_denominator);

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
        zIndex: drawingHighlighted ? 35 : 20,
      }}
      onClick={onPress}
      disabled={disabled || busy}
      aria-label={`Bet on ${option.name}, win ${multiplier} times`}
    >
      {winner && <span className="option-node__badge">Win</span>}

      <span className="option-node__surface" aria-hidden="true">
        <span className="option-node__art-half">
          <OptionArtwork
            imageUrl={option.image_url}
            code={option.code}
            name={option.name}
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
          <span className="option-node__payout">
            win <strong>{multiplier}</strong> times
          </span>
          <span className="option-node__reward-dots">
            {Array.from({ length: dots }, (_, index) => (
              <i key={index} />
            ))}
          </span>
        </span>
      </span>
    </button>
  );
}
