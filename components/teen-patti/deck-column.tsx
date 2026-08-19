"use client";

import clsx from "clsx";
import { formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import { PlayingCard } from "@/components/teen-patti/playing-card";
import type { DealtHand, PublicDeck } from "@/types/teen-patti";

export type DeckVisualPhase = "idle" | "dealing" | "flipping" | "winner" | "settled";

export function DeckColumn({
  deck,
  deckIndex,
  stake,
  winner,
  disabled,
  busy,
  hand,
  phase,
  onPress,
}: {
  deck: PublicDeck;
  deckIndex: number;
  stake: string;
  winner: boolean;
  disabled: boolean;
  busy: boolean;
  hand?: DealtHand;
  phase: DeckVisualPhase;
  onPress: () => void;
}) {
  const dealing = phase === "dealing";
  const settled = phase === "winner" || phase === "settled";
  const flipping = phase === "flipping" || settled;
  const faceUp = flipping && Boolean(hand);
  const dimLoser = settled && Boolean(hand) && !winner;
  const hasStake = stake !== "0" && stake !== "";
  const cards = hand?.cards ?? [undefined, undefined, undefined];

  const dealBaseDelay = deckIndex * 140;
  const flipBaseDelay = deckIndex * 180;

  return (
    <button
      type="button"
      className={clsx(
        "tp-deck",
        winner && settled && "tp-deck--winner",
        dimLoser && "tp-deck--loser",
        dealing && "tp-deck--drawing",
        hasStake && "tp-deck--staked",
        disabled && "tp-deck--disabled",
      )}
      disabled={disabled || busy}
      onClick={onPress}
      aria-label={`Bet on ${deck.name}${hasStake ? `. Current stake ${stake} coins.` : ""}`}
      data-deck-id={deck.id}
    >
      <span className="tp-deck__ribbon">
        <span>{deck.name}</span>
        {winner && settled && <span className="tp-deck__crown" aria-hidden="true">★</span>}
      </span>

      <span className="tp-deck__cards" aria-hidden={!faceUp}>
        {cards.map((code, index) => (
          <PlayingCard
            key={`${deck.id}-${index}`}
            code={code}
            faceUp={faceUp}
            dealing={dealing || flipping}
            dealDelayMs={dealing ? dealBaseDelay + index * 80 : 0}
            flipDelayMs={flipping ? flipBaseDelay + index * 100 : 0}
            dim={dimLoser}
            size="md"
          />
        ))}
      </span>

      <span className={clsx("tp-deck__meta", faceUp && hand && "tp-deck__meta--show")}>
        {faceUp && hand
          ? handCategoryLabel(hand.category)
          : dealing
            ? "Dealing…"
            : hasStake
              ? "Locked in"
              : "Tap to bet"}
      </span>

      <span className={clsx("tp-deck__stake", hasStake && "tp-deck__stake--active")}>
        <b aria-hidden="true">●</b>
        {formatInteger(stake)}
      </span>
    </button>
  );
}
