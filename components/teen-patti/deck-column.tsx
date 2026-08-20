"use client";

import clsx from "clsx";
import Image from "next/image";
import { formatCompactAmount, formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import { PlayingCard } from "@/components/teen-patti/playing-card";
import { SeatAvatar } from "@/components/teen-patti/seat-avatar";
import type { DealtHand, PublicDeck } from "@/types/teen-patti";

export type DeckVisualPhase = "idle" | "dealing" | "flipping" | "winner" | "settled";

const DECK_ART = [
  {
    tone: "green",
    throne: "/assets/teen-patti/throne-green.png",
    avatar: "/assets/teen-patti/avatar-emerald.png",
  },
  {
    tone: "blue",
    throne: "/assets/teen-patti/throne-blue.png",
    avatar: "/assets/teen-patti/avatar-sapphire.png",
  },
  {
    tone: "pink",
    throne: "/assets/teen-patti/throne-pink.png",
    avatar: "/assets/teen-patti/avatar-ruby.png",
  },
] as const;

const DECK_ART_BY_CODE: Record<string, (typeof DECK_ART)[number]> = {
  DECK_A: DECK_ART[0],
  DECK_B: DECK_ART[1],
  DECK_C: DECK_ART[2],
};

export function DeckColumn({
  deck,
  deckIndex,
  stake,
  potTotal,
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
  potTotal?: string;
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
  const art = DECK_ART_BY_CODE[deck.code.toUpperCase()] ?? DECK_ART[deckIndex % DECK_ART.length];

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
        busy && "tp-deck--busy",
        disabled && "tp-deck--disabled",
      )}
      disabled={disabled || busy}
      onClick={onPress}
      aria-label={busy
        ? `${deck.name}. Confirming ${stake} coins.`
        : disabled
        ? `${deck.name}. Betting unavailable.${hasStake ? ` Current stake ${stake} coins.` : ""}`
        : `Bet on ${deck.name}${hasStake ? `. Current stake ${stake} coins.` : ""}`}
      data-deck-id={deck.id}
    >
      <span className="tp-deck__identity">
        <span className="tp-deck__throne" aria-hidden="true">
          <Image
            src={art.throne}
            alt=""
            width={640}
            height={640}
            sizes="88px"
            loading="eager"
            draggable={false}
          />
        </span>
        <span className="tp-deck__avatar">
          <SeatAvatar
            imageUrl={deck.image_url}
            fallbackSrc={art.avatar}
            className="tp-deck__avatar-image"
          />
        </span>
        {winner && settled && <span className="tp-deck__winner-crown" aria-hidden="true">♛</span>}
      </span>

      <span className="tp-deck__cabinet">
        <span className="tp-deck__header">
          <strong>{deck.name}</strong>
          <small>Pot {formatCompactAmount(potTotal ?? "0")}</small>
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
              : busy
                ? "Confirming"
                : hasStake
                ? "Bet placed"
                : disabled
                  ? "Next round"
                  : "Tap to bet"}
        </span>
      </span>

      <span className={clsx("tp-deck__stake", hasStake && "tp-deck__stake--active")}>
        <i aria-hidden="true" />
        <span>Your bet</span>
        <b>{formatInteger(stake)}</b>
      </span>
    </button>
  );
}
