const DRAW_TICK_MS = 160;
const MAX_WHEEL_OPTIONS = 8;

/**
 * Only freeze on the winner for the final tick. The center timer shows
 * Math.max(1, ceil(ms/1000)), so a longer lock (1s+) looks like it stopped
 * while the display still reads "2s" / early "1s".
 */
const FINAL_SETTLE_MS = 360;

/**
 * Sequential option for one tick. Steps through options 0 -> 1 -> 2 -> ... -> count - 1 -> 0.
 */
function sequenceFocusAtTick(
  tick: number,
  optionCount: number,
): number {
  if (optionCount <= 0) return 0;
  return ((tick % optionCount) + optionCount) % optionCount;
}

/**
 * Resolves which option node should pulse during the drawing phase.
 * Sequential clockwise rotation each tick; settles on the server winner only for the final tick.
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

  // Keep rotating while the timer still runs; settle on winner at the end.
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
  return sequenceFocusAtTick(tick, count);
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
