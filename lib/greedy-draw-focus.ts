const DRAW_TICK_MS = 160;
const MAX_WHEEL_OPTIONS = 8;

/**
 * Sequential option for one tick. Steps through options 0 -> 1 -> 2 -> ... -> count - 1 -> 0.
 */
function sequenceFocusAtTick(tick: number, optionCount: number): number {
  if (optionCount <= 0) return 0;
  return ((tick % optionCount) + optionCount) % optionCount;
}

/**
 * Resolves which option node should pulse during the drawing phase.
 * Ease-out deceleration trajectory that is mathematically guaranteed to land
 * on `stopIndex` when the winner is known.
 */
export function greedyDrawFocusIndex({
  isDrawing,
  optionCount,
  durationMs,
  drawingMs,
  stopIndex,
  drawingStartedAt,
  resultRevealAt,
  serverOffsetMs,
}: {
  isDrawing: boolean;
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

  const now = Date.now() + (serverOffsetMs ?? 0);
  const startedMs = drawingStartedAt
    ? new Date(drawingStartedAt).getTime()
    : Number.NaN;
  const revealMs = resultRevealAt
    ? new Date(resultRevealAt).getTime()
    : Number.NaN;

  let totalDuration = Math.max(DRAW_TICK_MS, durationMs);
  let elapsedMs = 0;

  if (Number.isFinite(startedMs)) {
    elapsedMs = Math.max(0, now - startedMs);
    if (Number.isFinite(revealMs) && revealMs > startedMs) {
      totalDuration = Math.max(DRAW_TICK_MS, revealMs - startedMs);
    }
  } else {
    elapsedMs = Math.max(0, totalDuration - Math.max(0, drawingMs));
  }

  const progress = Math.min(1, Math.max(0, elapsedMs / totalDuration));

  if (normalizedStop !== null) {
    if (progress >= 1 || totalDuration - elapsedMs < 180) {
      return normalizedStop;
    }

    const laps = Math.max(2, Math.floor(totalDuration / 900));
    const totalSteps = laps * count + normalizedStop;

    const eased = 1 - Math.pow(1 - progress, 2.0);
    const currentStep = Math.min(
      totalSteps,
      Math.floor(eased * (totalSteps + 0.999)),
    );
    return currentStep % count;
  }

  const tick = Math.floor(elapsedMs / DRAW_TICK_MS);
  return sequenceFocusAtTick(tick, count);
}

/** Prefer the revealed winner's option id; fall back to the server stop index. */
export function resolveGreedyDrawStopIndex({
  winningOptionIndex,
  winnerId,
  options,
}: {
  winningOptionIndex?: number | null;
  winnerId?: string | null;
  options: Array<{ id: string }>;
}): number | null {
  if (winnerId && options.length) {
    const index = options.findIndex((option) => option.id === winnerId);
    if (index >= 0) return index;
  }
  if (
    typeof winningOptionIndex === "number" &&
    Number.isFinite(winningOptionIndex) &&
    winningOptionIndex >= 0
  ) {
    const idx = Math.floor(winningOptionIndex);
    return options.length > 0 ? idx % options.length : idx;
  }
  return null;
}

export const GREEDY_DRAW_TICK_MS = DRAW_TICK_MS;
