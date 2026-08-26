"use client";

import clsx from "clsx";
import Image from "next/image";
import { formatCompactAmount, formatInteger } from "@/lib/format";
import { handCategoryLabel } from "@/lib/playing-cards";
import { PlayingCard } from "@/components/teen-patti/playing-card";
import { SeatAvatar } from "@/components/teen-patti/seat-avatar";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import type { DealtHand, PublicBetAggregate, PublicDeck } from "@/types/teen-patti";

export type DeckVisualPhase = "opening" | "idle" | "dealing" | "turning" | "flipping" | "winner" | "settled";

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
  previewCard,
  bettors,
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
  previewCard?: string;
  bettors: PublicBetAggregate[];
  phase: DeckVisualPhase;
  onPress: () => void;
}) {
  const opening = phase === "opening";
  const dealing = phase === "dealing" || opening;
  const turning = phase === "turning";
  const settled = phase === "winner" || phase === "settled";
  const flipping = phase === "flipping" || settled;
  const dimLoser = settled && Boolean(hand) && !winner;
  const hasStake = stake !== "0" && stake !== "";
  const firstCard = hand?.cards[0] ?? previewCard;
  const cards: [string | undefined, string | undefined, string | undefined] = hand
    ? hand.cards
    : [firstCard, undefined, undefined];
  const art = DECK_ART_BY_CODE[deck.code.toUpperCase()] ?? DECK_ART[deckIndex % DECK_ART.length];

  const flipBaseDelay = deckIndex * 340;
  const visibleBettors = bettors.slice(0, 3);

  return (
    <div className="tp-deck-wrap">
      <button
        type="button"
        className={clsx(
          "tp-deck",
          `tp-deck--${art.tone}`,
          winner && settled && "tp-deck--winner",
          dimLoser && "tp-deck--loser",
          (dealing || turning) && "tp-deck--drawing",
          hasStake && "tp-deck--staked",
          busy && "tp-deck--busy",
          disabled && "tp-deck--disabled",
        )}
        disabled={disabled}
        onClick={onPress}
        aria-busy={busy || undefined}
        aria-label={disabled
          ? `${deck.name}. Betting unavailable.${hasStake ? ` Current stake ${stake} coins.` : ""}`
          : `Bet on ${deck.name}${hasStake ? `. Current stake ${stake} coins.` : ""}${busy ? ". Other bets are confirming." : ""}`}
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

          <span className="tp-deck__cards">
            {cards.map((code, index) => (
              <PlayingCard
                key={`${deck.id}-${index}`}
                code={code}
                faceUp={index === 0 ? Boolean(firstCard) : flipping && Boolean(hand)}
                dealing={opening}
                dealDelayMs={opening ? index * 360 + deckIndex * 95 : 0}
                flipDelayMs={flipping && index > 0 ? flipBaseDelay + (index - 1) * 105 : 0}
                size="sm"
              />
            ))}
          </span>

          <span className={clsx("tp-deck__ribbon", settled && hand && "tp-deck__ribbon--show")}>
            {winner && settled && <b aria-hidden="true">★</b>}
            {settled && hand
              ? handCategoryLabel(hand.category)
              : phase === "flipping"
                ? "Revealing"
              : turning
                ? "Turning"
                : dealing
                ? "Locked"
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

      {visibleBettors.length > 0 && (
        <span className="tp-deck-bettors" aria-hidden="true">
          {visibleBettors.map((bettor) => (
            <PlayerAvatar
              key={bettor.user_id}
              player={bettor}
              className="tp-deck-bettor-avatar"
            />
          ))}
        </span>
      )}
    </div>
  );
}
