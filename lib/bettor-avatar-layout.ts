import type { CSSProperties } from "react";

/** Stable 32-bit hash so avatar spots don't jump on every render. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type BettorAvatarSpot = {
  left: number;
  top: number;
};

/**
 * Pick a deterministic spot inside a safe rectangle.
 * `left`/`top` are percentages of the option container.
 */
export function bettorAvatarSpot(
  seed: string,
  index: number,
  bounds: { minLeft: number; maxLeft: number; minTop: number; maxTop: number },
): BettorAvatarSpot {
  const hash = hashString(`${seed}:${index}`);
  const leftSpan = Math.max(0, bounds.maxLeft - bounds.minLeft);
  const topSpan = Math.max(0, bounds.maxTop - bounds.minTop);
  const left = bounds.minLeft + ((hash % 1000) / 999) * leftSpan;
  const top = bounds.minTop + (((Math.floor(hash / 1000) % 1000) / 999) * topSpan);
  return { left, top };
}

export function bettorAvatarStyle(spot: BettorAvatarSpot): CSSProperties {
  return {
    left: `${spot.left}%`,
    top: `${spot.top}%`,
  };
}

/** Greedy wheel: percentages of the art half — payout band stays above. */
export const GREEDY_AVATAR_BOUNDS = {
  minLeft: 14,
  maxLeft: 86,
  minTop: 10,
  maxTop: 72,
} as const;

/** Classic cards: upper art area above "Win Nx". */
export const CLASSIC_AVATAR_BOUNDS = {
  minLeft: 12,
  maxLeft: 88,
  minTop: 8,
  maxTop: 48,
} as const;

/** Lucky 77: mid art zone inside the bet button, clear of Pays. */
export const LUCKY77_AVATAR_BOUNDS = {
  minLeft: 14,
  maxLeft: 86,
  minTop: 22,
  maxTop: 58,
} as const;

/** Teen Patti: middle of the hand cabinet, away from pot + stake. */
export const TEEN_PATTI_AVATAR_BOUNDS = {
  minLeft: 14,
  maxLeft: 86,
  minTop: 34,
  maxTop: 68,
} as const;
