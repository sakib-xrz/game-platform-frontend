import clsx from "clsx";
import type { CSSProperties } from "react";
import { isRedSuit, rankLabel, suitSymbol } from "@/lib/playing-cards";

export type PlayingCardSize = "sm" | "md" | "lg";

type PipPosition = {
  x: number;
  y: number;
  flipped?: boolean;
};

type CourtRank = "J" | "Q" | "K";

const PIP_LAYOUTS: Record<string, PipPosition[]> = {
  A: [{ x: 50, y: 50 }],
  "2": [{ x: 50, y: 24 }, { x: 50, y: 76, flipped: true }],
  "3": [{ x: 50, y: 22 }, { x: 50, y: 50 }, { x: 50, y: 78, flipped: true }],
  "4": [
    { x: 31, y: 25 }, { x: 69, y: 25 },
    { x: 31, y: 75, flipped: true }, { x: 69, y: 75, flipped: true },
  ],
  "5": [
    { x: 31, y: 23 }, { x: 69, y: 23 }, { x: 50, y: 50 },
    { x: 31, y: 77, flipped: true }, { x: 69, y: 77, flipped: true },
  ],
  "6": [
    { x: 31, y: 20 }, { x: 69, y: 20 }, { x: 31, y: 50 }, { x: 69, y: 50 },
    { x: 31, y: 80, flipped: true }, { x: 69, y: 80, flipped: true },
  ],
  "7": [
    { x: 31, y: 18 }, { x: 69, y: 18 }, { x: 50, y: 34 },
    { x: 31, y: 50 }, { x: 69, y: 50 },
    { x: 31, y: 82, flipped: true }, { x: 69, y: 82, flipped: true },
  ],
  "8": [
    { x: 31, y: 17 }, { x: 69, y: 17 }, { x: 50, y: 33 },
    { x: 31, y: 50 }, { x: 69, y: 50 }, { x: 50, y: 67, flipped: true },
    { x: 31, y: 83, flipped: true }, { x: 69, y: 83, flipped: true },
  ],
  "9": [
    { x: 31, y: 16 }, { x: 69, y: 16 }, { x: 31, y: 38 }, { x: 69, y: 38 },
    { x: 50, y: 50 }, { x: 31, y: 62, flipped: true }, { x: 69, y: 62, flipped: true },
    { x: 31, y: 84, flipped: true }, { x: 69, y: 84, flipped: true },
  ],
  "10": [
    { x: 31, y: 14 }, { x: 69, y: 14 }, { x: 50, y: 27 },
    { x: 31, y: 38 }, { x: 69, y: 38 },
    { x: 31, y: 62, flipped: true }, { x: 69, y: 62, flipped: true },
    { x: 50, y: 73, flipped: true }, { x: 31, y: 86, flipped: true },
    { x: 69, y: 86, flipped: true },
  ],
};

const RANK_NAMES: Record<string, string> = {
  A: "Ace",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",
  J: "Jack",
  Q: "Queen",
  K: "King",
};

const SUIT_NAMES: Record<string, string> = {
  "♠": "spades",
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs",
};

function CourtHeadwear({ rank }: { rank: CourtRank }) {
  if (rank === "J") {
    return (
      <>
        <path className="tp-card__court-secondary" d="M33 27c4-12 12-17 27-14l8 7-8 10-27-3Z" />
        <path className="tp-card__court-gold" d="M31 26c12 3 25 3 38-1l-1 6c-12 3-24 3-36 0l-1-5Z" />
        <path className="tp-card__court-feather" d="M62 18c8-10 15-10 19-11-5 4-7 10-9 17l-10-6Z" />
        <path className="tp-card__court-ink" d="M63 20c7-7 11-9 16-12" />
      </>
    );
  }

  if (rank === "Q") {
    return (
      <>
        <path className="tp-card__court-gold" d="m32 27 2-17 10 10 6-15 7 15 10-10 2 17H32Z" />
        <path className="tp-card__court-secondary" d="M33 24h35l-2 8H35l-2-8Z" />
        <circle className="tp-card__court-jewel" cx="38" cy="19" r="2.7" />
        <circle className="tp-card__court-jewel" cx="50" cy="12" r="2.7" />
        <circle className="tp-card__court-jewel" cx="63" cy="19" r="2.7" />
      </>
    );
  }

  return (
    <>
      <path className="tp-card__court-gold" d="m29 28 3-19 11 10 7-15 8 15L69 9l3 19H29Z" />
      <path className="tp-card__court-secondary" d="M30 24h41l-3 9H33l-3-9Z" />
      <circle className="tp-card__court-jewel" cx="36" cy="19" r="2.7" />
      <path className="tp-card__court-jewel" d="m50 9 4 4-4 4-4-4 4-4Z" />
      <circle className="tp-card__court-jewel" cx="65" cy="19" r="2.7" />
    </>
  );
}

function CourtObject({ rank }: { rank: CourtRank }) {
  if (rank === "J") {
    return (
      <g className="tp-card__court-object">
        <path className="tp-card__court-metal" d="m71 12 8 2-5 8-3-10Z" />
        <path className="tp-card__court-ink" d="m74 18-8 50" />
        <path className="tp-card__court-gold" d="m64 55 6 1-2 12-6-1 2-12Z" />
      </g>
    );
  }

  if (rank === "Q") {
    return (
      <g className="tp-card__court-object">
        <path className="tp-card__court-ink" d="M72 24 68 69" />
        <circle className="tp-card__court-secondary" cx="72" cy="20" r="5" />
        <circle className="tp-card__court-primary" cx="66" cy="21" r="4.5" />
        <circle className="tp-card__court-primary" cx="76" cy="25" r="4.5" />
        <circle className="tp-card__court-gold" cx="71" cy="22" r="3.2" />
        <path className="tp-card__court-leaf" d="M68 48c-8-6-11-1-10 4 5 2 8 0 10-4Zm1 8c8-5 11 1 9 5-5 1-8-1-9-5Z" />
      </g>
    );
  }

  return (
    <g className="tp-card__court-object">
      <path className="tp-card__court-metal" d="m73 9 5 10-13 3 8-13Z" />
      <path className="tp-card__court-ink" d="M71 19 62 68" />
      <path className="tp-card__court-gold" d="m59 48 11 2-1 5-11-2 1-5Z" />
      <path className="tp-card__court-gold" d="m60 61 7 1-2 9-7-1 2-9Z" />
    </g>
  );
}

function CourtHalf({
  rank,
  suit,
  transform,
}: {
  rank: CourtRank;
  suit: string;
  transform?: string;
}) {
  return (
    <g className="tp-card__court-half" transform={transform}>
      <path className="tp-card__court-primary" d="M5 4h90v68L78 64 65 73 50 65 35 73 21 63 5 72V4Z" />
      <path className="tp-card__court-secondary" d="m5 4 26 0-8 26L5 39V4Zm90 0H76l5 27 14 9V4Z" />
      <path className="tp-card__court-gold" d="M5 45 24 34l8 9-13 11 16 19H20L5 59V45Zm90 0L80 34l-9 9 13 11-17 19h16l12-14V45Z" />

      <CourtObject rank={rank} />

      <path className="tp-card__court-robe" d="M27 72c2-19 9-26 23-26s22 7 24 26H27Z" />
      <path className="tp-card__court-secondary" d="m31 71 7-21 12 11 12-11 8 21H31Z" />
      <path className="tp-card__court-gold" d="m40 49 10 12 10-12-3 22H44l-4-22Z" />
      <path className="tp-card__court-collar" d="m35 47 8-5 7 8 8-8 8 5-8 9-8-5-7 5-8-9Z" />

      <path className="tp-card__court-neck" d="M44 40h13v12H44z" />
      <path className="tp-card__court-face" d="M36 27c0-10 6-16 14-16 10 0 16 6 16 16l-3 14-7 7H45l-7-7-2-14Z" />
      <path className="tp-card__court-hair" d="M36 31c-3-13 3-21 14-21 12 0 19 8 16 22l-5-8-5-7c-4 5-10 8-18 8l-2 6Z" />
      {rank === "Q" ? <path className="tp-card__court-hair" d="M38 28c-4 7-3 15 2 21l5-4-4-16-3-1Zm25 0c4 7 2 15-3 21l-5-4 5-16 3-1Z" /> : null}
      {rank === "K" ? <path className="tp-card__court-beard" d="m41 38 4 11 5-3 6 3 5-11-6 3-5-2-4 2-5-3Z" /> : null}
      <CourtHeadwear rank={rank} />

      <g className="tp-card__court-features">
        <path d="M41 31h5m9 0h5" />
        <path d="m50 31-2 7 4 1" />
        <path d={rank === "K" ? "M43 39c4-3 7-2 7 1 1-3 4-4 8-1" : "M45 42c4 2 7 2 11 0"} />
      </g>

      <path className="tp-card__court-hand" d="M66 54c5-4 10-2 10 2-2 5-7 6-11 3l1-5Z" />
      <text className="tp-card__court-suit" x="15" y="20" textAnchor="middle">{suit}</text>
    </g>
  );
}

function CourtArtwork({ rank, suit, red }: { rank: CourtRank; suit: string; red: boolean }) {
  return (
    <svg
      className={clsx(
        "tp-card__court-art",
        `tp-card__court-art--${rank.toLowerCase()}`,
        red && "tp-card__court-art--red",
      )}
      viewBox="0 0 100 148"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      <rect className="tp-card__court-paper" x="1.5" y="1.5" width="97" height="145" rx="3" />
      <CourtHalf rank={rank} suit={suit} />
      <CourtHalf rank={rank} suit={suit} transform="rotate(180 50 74)" />
      <path className="tp-card__court-divider" d="M5 74h90M35 74l15-9 15 9-15 9-15-9Z" />
      <text className="tp-card__court-center-suit" x="50" y="79" textAnchor="middle">{suit}</text>
    </svg>
  );
}

function CardCenter({ rank, suit, red }: { rank: string; suit: string; red: boolean }) {
  if (rank === "J" || rank === "Q" || rank === "K") {
    return (
      <span className="tp-card__court" aria-hidden="true">
        <CourtArtwork rank={rank} suit={suit} red={red} />
      </span>
    );
  }

  const pips = PIP_LAYOUTS[rank] ?? PIP_LAYOUTS.A;
  return (
    <span className={`tp-card__pips tp-card__pips--${rank}`} aria-hidden="true">
      {pips.map((pip, index) => (
        <i
          key={`${rank}-${index}`}
          className={pip.flipped ? "is-flipped" : undefined}
          style={{
            "--pip-x": `${pip.x}%`,
            "--pip-y": `${pip.y}%`,
          } as CSSProperties}
        >
          {suit}
        </i>
      ))}
    </span>
  );
}

function CardBackArtwork() {
  return (
    <svg
      className="tp-card__back-art"
      viewBox="0 0 100 144"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
    >
      <rect className="tp-card__back-frame" x="4" y="4" width="92" height="136" rx="8" />
      <rect className="tp-card__back-frame tp-card__back-frame--inner" x="9" y="9" width="82" height="126" rx="5" />
      <path className="tp-card__back-lattice" d="M10 30 30 10m-20 42L50 10M10 74 70 10M10 96 90 16M10 118 90 38M18 134l72-74m-50 74 50-52m-28 52 28-30M90 30 70 10m20 42L50 10m40 64L30 10m60 86L10 16m80 102L10 38m72 96L10 60m50 74L10 82m28 52-28-30" />
      <path className="tp-card__back-corner" d="M12 31c12-1 19-8 20-19-5 8-11 13-20 15m0 7c15-1 24-9 25-22" />
      <path className="tp-card__back-corner" d="M88 31c-12-1-19-8-20-19 5 8 11 13 20 15m0 7C73 33 64 25 63 12" />
      <path className="tp-card__back-corner" d="M12 113c12 1 19 8 20 19-5-8-11-13-20-15m0-7c15 1 24 9 25 22" />
      <path className="tp-card__back-corner" d="M88 113c-12 1-19 8-20 19 5-8 11-13 20-15m0-7c-15 1-24 9-25 22" />
      <path className="tp-card__back-medallion" d="m50 22 28 25v50L50 122 22 97V47l28-25Zm0 9L29 51v42l21 20 21-20V51L50 31Z" />
      <circle className="tp-card__back-ring" cx="50" cy="72" r="25" />
      <circle className="tp-card__back-ring tp-card__back-ring--inner" cx="50" cy="72" r="19" />
      <path className="tp-card__back-filigree" d="M50 45c-5 8-11 10-17 13 5 1 8 5 10 10-6-1-10 1-13 5 6 1 11 5 14 11-1-8 2-11 6-16 4 5 7 8 6 16 3-6 8-10 14-11-3-4-7-6-13-5 2-5 5-9 10-10-6-3-12-5-17-13Z" />
      <path className="tp-card__back-spade" d="M50 52c-5 9-16 14-16 24 0 7 8 11 14 6-1 7-4 10-8 13h20c-4-3-7-6-8-13 6 5 14 1 14-6 0-10-11-15-16-24Z" />
    </svg>
  );
}

/**
 * A single Teen Patti playing card. Both sides remain mounted so a round can
 * deal face-down cards and reveal them with a real 3D turn.
 */
export function PlayingCard({
  code,
  faceUp,
  dealDelayMs = 0,
  flipDelayMs = 0,
  dealing = false,
  size = "md",
  dim = false,
}: {
  code?: string;
  faceUp: boolean;
  dealDelayMs?: number;
  flipDelayMs?: number;
  dealing?: boolean;
  size?: PlayingCardSize;
  dim?: boolean;
}) {
  const red = code ? isRedSuit(code) : false;
  const rank = code ? rankLabel(code) : "";
  const suit = code ? suitSymbol(code) : "";
  const showFace = faceUp && Boolean(code);
  const accessibleName = showFace
    ? `${RANK_NAMES[rank] ?? rank} of ${SUIT_NAMES[suit] ?? suit}`
    : "Face-down playing card";

  return (
    <span
      className={clsx(
        "tp-card-scene",
        `tp-card-scene--${size}`,
        dealing && "tp-card-scene--deal",
        showFace && "tp-card-scene--flipped",
        dim && "tp-card-scene--dim",
      )}
      style={
        {
          "--tp-deal-delay": `${dealDelayMs}ms`,
          "--tp-flip-delay": `${flipDelayMs}ms`,
        } as CSSProperties
      }
      aria-label={accessibleName}
      role="img"
    >
      <span className="tp-card-motion" aria-hidden="true">
        <span className="tp-card-flip">
          <span className="tp-card tp-card--face tp-card--back">
            <span className="tp-card__back-pattern" />
            <CardBackArtwork />
          </span>
          <span
            className={clsx(
              "tp-card tp-card--face tp-card--front",
              rank && `tp-card--rank-${rank.toLowerCase()}`,
              red && "tp-card--red",
            )}
          >
            {code ? (
              <>
                <span className="tp-card__corner tp-card__corner--tl">
                  <b>{rank}</b>
                  <i>{suit}</i>
                </span>
                <CardCenter rank={rank} suit={suit} red={red} />
                <span className="tp-card__corner tp-card__corner--br">
                  <b>{rank}</b>
                  <i>{suit}</i>
                </span>
              </>
            ) : null}
          </span>
        </span>
      </span>
    </span>
  );
}
