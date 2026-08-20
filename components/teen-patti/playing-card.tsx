import clsx from "clsx";
import type { CSSProperties } from "react";
import { isRedSuit, rankLabel, suitSymbol } from "@/lib/playing-cards";

export type PlayingCardSize = "sm" | "md" | "lg";

type PipPosition = {
  x: number;
  y: number;
  flipped?: boolean;
};

const PIP_LAYOUTS: Record<string, PipPosition[]> = {
  A: [{ x: 50, y: 50 }],
  "2": [{ x: 50, y: 25 }, { x: 50, y: 75, flipped: true }],
  "3": [{ x: 50, y: 23 }, { x: 50, y: 50 }, { x: 50, y: 77, flipped: true }],
  "4": [
    { x: 31, y: 27 }, { x: 69, y: 27 },
    { x: 31, y: 73, flipped: true }, { x: 69, y: 73, flipped: true },
  ],
  "5": [
    { x: 31, y: 25 }, { x: 69, y: 25 }, { x: 50, y: 50 },
    { x: 31, y: 75, flipped: true }, { x: 69, y: 75, flipped: true },
  ],
  "6": [
    { x: 31, y: 23 }, { x: 69, y: 23 }, { x: 31, y: 50 }, { x: 69, y: 50 },
    { x: 31, y: 77, flipped: true }, { x: 69, y: 77, flipped: true },
  ],
  "7": [
    { x: 31, y: 20 }, { x: 69, y: 20 }, { x: 50, y: 35 },
    { x: 31, y: 50 }, { x: 69, y: 50 },
    { x: 31, y: 78, flipped: true }, { x: 69, y: 78, flipped: true },
  ],
  "8": [
    { x: 31, y: 19 }, { x: 69, y: 19 }, { x: 50, y: 34 },
    { x: 31, y: 50 }, { x: 69, y: 50 }, { x: 50, y: 66, flipped: true },
    { x: 31, y: 81, flipped: true }, { x: 69, y: 81, flipped: true },
  ],
  "9": [
    { x: 31, y: 18 }, { x: 69, y: 18 }, { x: 31, y: 38 }, { x: 69, y: 38 },
    { x: 50, y: 50 }, { x: 31, y: 62, flipped: true }, { x: 69, y: 62, flipped: true },
    { x: 31, y: 82, flipped: true }, { x: 69, y: 82, flipped: true },
  ],
  "10": [
    { x: 31, y: 16 }, { x: 69, y: 16 }, { x: 50, y: 29 },
    { x: 31, y: 39 }, { x: 69, y: 39 },
    { x: 31, y: 61, flipped: true }, { x: 69, y: 61, flipped: true },
    { x: 50, y: 71, flipped: true }, { x: 31, y: 84, flipped: true },
    { x: 69, y: 84, flipped: true },
  ],
};

function CardCenter({ rank, suit }: { rank: string; suit: string }) {
  if (["J", "Q", "K"].includes(rank)) {
    return (
      <span className="tp-card__court" aria-hidden="true">
        <span>{suit}</span>
        <b>{rank}</b>
        <i>{suit}</i>
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

/**
 * A single Teen Patti playing card. Cards are always mounted so the
 * face-down → face-up transition can happen with a real 3D flip.
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
      aria-hidden={!showFace}
      aria-label={code && showFace ? `${rank} ${suit}` : undefined}
      role={code && showFace ? "img" : undefined}
    >
      <span className="tp-card-flip">
        <span className="tp-card tp-card--face tp-card--back" aria-hidden="true">
          <span className="tp-card__back-pattern" />
          <span className="tp-card__back-emblem">♠</span>
        </span>
        <span
          className={clsx(
            "tp-card tp-card--face tp-card--front",
            red && "tp-card--red",
          )}
        >
          {code ? (
            <>
              <span className="tp-card__corner tp-card__corner--tl">
                <b>{rank}</b>
                <i>{suit}</i>
              </span>
              <CardCenter rank={rank} suit={suit} />
              <span className="tp-card__corner tp-card__corner--br">
                <b>{rank}</b>
                <i>{suit}</i>
              </span>
            </>
          ) : null}
        </span>
      </span>
    </span>
  );
}
