"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { BettorAvatarScatter } from "@/components/greedy/bettor-avatar-scatter";
import type { BetLanding } from "@/hooks/use-greedy-game";
import { getChipThemeForAmount } from "@/lib/chip-themes";
import { getOptionDisplayName, OptionArtwork } from "@/lib/option-art";
import { GREEDY_AVATAR_BOUNDS } from "@/lib/bettor-avatar-layout";
import { formatInteger, formatMultiplier } from "@/lib/format";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

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
  bettors,
  landings = [],
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
  landings?: BetLanding[];
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
    bettors.length
      ? `${bettors.length} ${bettors.length === 1 ? "player has" : "players have"} selected this option`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

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
        zIndex: drawingHighlighted ? 38 : winner ? 40 : hasBet ? 25 : 20,
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

        {landings.map((landing, index) => {
          const theme = getChipThemeForAmount(landing.amount, index);
          return (
            <span
              key={landing.id}
              className={`option-node__coin-landing option-node__coin-landing--${index % 3}`}
              style={{
                "--chip-rim": theme.rim,
                "--chip-core": theme.core,
                "--chip-ink": theme.ink,
              } as CSSProperties}
              aria-hidden="true"
            >
              <span className="player-avatar__coin">
                <span className="player-avatar__coin-rim" />
                <span className="player-avatar__coin-core" />
              </span>
            </span>
          );
        })}

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

      <BettorAvatarScatter
        optionId={option.id}
        bettors={bettors}
        bounds={GREEDY_AVATAR_BOUNDS}
        containerClassName="option-node__bettors"
        avatarClassName="option-node__bettor-avatar"
        slotClassName="option-node__bettor-slot"
      />
    </div>
  );
}
