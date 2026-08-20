"use client";

import clsx from "clsx";
import Image from "next/image";
import { formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import { PlayingCard } from "@/components/teen-patti/playing-card";
import type { DealtHand, PublicDeck } from "@/types/teen-patti";

export type DeckVisualPhase = "idle" | "dealing" | "flipping" | "winner" | "settled";

const DECK_ART = [
  { tone: "green", src: "/assets/teen-patti/throne-green.png" },
  { tone: "blue", src: "/assets/teen-patti/throne-blue.png" },
  { tone: "pink", src: "/assets/teen-patti/throne-pink.png" },
] as const;

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
  const art = DECK_ART[deckIndex % DECK_ART.length];

  const dealBaseDelay = deckIndex * 140;
  const flipBaseDelay = deckIndex * 180;

  return (
    <button
      type="button"
      className={clsx(
        "tp-deck",
        `tp-deck--${art.tone}`,
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
      <span className="tp-deck__throne" aria-hidden="true">
        <Image
          src={art.src}
          alt=""
          width={640}
          height={640}
          sizes="(max-width: 414px) 30vw, 120px"
          loading="eager"
          draggable={false}
        />
      </span>

      <span className="tp-deck__cabinet">
        <span className="tp-deck__header">
          <small>{hasStake ? `BET: ${formatInteger(stake)}` : "BET: 0"}</small>
          <strong>{deck.name}</strong>
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
              size="sm"
            />
          ))}
        </span>

        <span className={clsx("tp-deck__ribbon", faceUp && hand && "tp-deck__ribbon--show")}>
          {winner && settled && <b aria-hidden="true">★</b>}
          {faceUp && hand
            ? handCategoryLabel(hand.category)
            : dealing
              ? "Dealing"
              : hasStake
                ? "Bet placed"
                : "Tap to bet"}
        </span>
      </span>

      <span className={clsx("tp-deck__stake", hasStake && "tp-deck__stake--active")}>
        <i aria-hidden="true">●</i>
        <b>{formatInteger(stake)}</b>
      </span>
    </button>
  );
}
