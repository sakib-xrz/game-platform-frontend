const DRAW_TICK_MS = 360;
const MAX_WHEEL_OPTIONS = 8;

/**
 * Only freeze on the winner for the final tick. The center timer shows
 * Math.max(1, ceil(ms/1000)), so a longer lock (1s+) looks like it stopped
 * while the display still reads "2s" / early "1s".
 */
const FINAL_SETTLE_MS = DRAW_TICK_MS;

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG so every client sees the same draw animation. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random option for one tick; avoids the previous tick and the eventual winner. */
function randomFocusAtTick(
  roundId: string,
  tick: number,
  optionCount: number,
  avoidIndex: number | null,
): number {
  const rng = mulberry32(hashSeed(`${roundId}#${tick}`));
  let next = Math.floor(rng() * optionCount);

  const previous =
    tick > 0
      ? Math.floor(
          mulberry32(hashSeed(`${roundId}#${tick - 1}`))() * optionCount,
        )
      : -1;

  for (
    let attempt = 0;
    attempt < 12 &&
    optionCount > 1 &&
    (next === previous || (avoidIndex !== null && next === avoidIndex));
    attempt += 1
  ) {
    next = Math.floor(rng() * optionCount);
  }

  return next;
}

/**
 * Resolves which option node should pulse during the drawing phase.
 * Random jump each tick; settles on the server winner only for the final tick.
 */
export function greedyDrawFocusIndex({
  isDrawing,
  roundId,
  optionCount,
  durationMs,
  drawingMs,
  stopIndex,
  drawingStartedAt,
  resultRevealAt,
  serverOffsetMs,
}: {
  isDrawing: boolean;
  roundId?: string | null;
  optionCount: number;
  durationMs: number;
  drawingMs: number;
  stopIndex: number | null | undefined;
  drawingStartedAt?: string | null;
  resultRevealAt?: string | null;
  serverOffsetMs?: number;
}): number {
  if (!isDrawing || optionCount <= 0) return -1;
  const count = Math.min(optionCount, MAX_WHEEL_OPTIONS);
  const normalizedStop =
    typeof stopIndex === "number" &&
    Number.isFinite(stopIndex) &&
    stopIndex >= 0
      ? Math.floor(stopIndex) % count
      : null;
  const seed = roundId || "greedy-draw";

  // Keep flashing while the timer still shows 2s / 1s; settle only at the end.
  if (normalizedStop !== null && drawingMs < FINAL_SETTLE_MS) {
    return normalizedStop;
  }

  const now = Date.now() + (serverOffsetMs ?? 0);
  const startedMs = drawingStartedAt
    ? new Date(drawingStartedAt).getTime()
    : Number.NaN;
  const revealMs = resultRevealAt
    ? new Date(resultRevealAt).getTime()
    : Number.NaN;

  let elapsedMs: number;
  if (Number.isFinite(startedMs)) {
    elapsedMs = Math.max(0, now - startedMs);
    if (Number.isFinite(revealMs)) {
      const remainingMs = Math.max(0, revealMs - now);
      if (normalizedStop !== null && remainingMs < FINAL_SETTLE_MS) {
        return normalizedStop;
      }
    }
  } else {
    const configuredDuration = Math.max(DRAW_TICK_MS, durationMs);
    elapsedMs = Math.max(0, configuredDuration - Math.max(0, drawingMs));
  }

  const tick = Math.floor(elapsedMs / DRAW_TICK_MS);
  return randomFocusAtTick(seed, tick, count, normalizedStop);
}

/** Prefer the server stop index; fall back to the revealed winner's option id. */
export function resolveGreedyDrawStopIndex({
  winningOptionIndex,
  winnerId,
  options,
}: {
  winningOptionIndex?: number | null;
  winnerId?: string | null;
  options: Array<{ id: string }>;
}): number | null {
  if (
    typeof winningOptionIndex === "number" &&
    Number.isFinite(winningOptionIndex) &&
    winningOptionIndex >= 0
  ) {
    return Math.floor(winningOptionIndex);
  }
  if (!winnerId || !options.length) return null;
  const index = options.findIndex((option) => option.id === winnerId);
  return index >= 0 ? index : null;
}

export const GREEDY_DRAW_TICK_MS = DRAW_TICK_MS;
export const GREEDY_DRAW_FINAL_SETTLE_MS = FINAL_SETTLE_MS;
