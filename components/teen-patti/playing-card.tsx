import clsx from "clsx";
import type { CSSProperties } from "react";
import { isRedSuit, rankLabel, suitSymbol } from "@/lib/playing-cards";

export type PlayingCardSize = "sm" | "md" | "lg";

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
              <span className="tp-card__pip" aria-hidden="true">{suit}</span>
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
