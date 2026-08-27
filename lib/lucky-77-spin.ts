/** Fixed Lucky 77 wheel geometry: 9 slots × 40°. */
export const LUCKY_77_SLOT_COUNT = 9;
export const LUCKY_77_SLOT_DEGREES = 360 / LUCKY_77_SLOT_COUNT;

/** Slow clockwise drift while betting / between rounds (°/s). */
export const LUCKY_77_IDLE_DEG_PER_SEC = 19;

/**
 * Gold highlight only in the final frames at reveal (countdown shows 0).
 * A longer window made the wheel look "locked" while the timer still read 2s/1s.
 */
export const LUCKY_77_WIN_HIGHLIGHT_MS = 50;

/** Very short ramp into peak blur. */
const SPIN_UP_MIN_MS = 90;
const SPIN_UP_MAX_MS = 200;
/** Peak blur speed (rev/s) — intentionally extreme. */
const PEAK_REV_PER_SEC = 9.2;
/** Final crawl speed (rev/s) — very slow sector-by-sector read to 0s. */
const CRAWL_REV_PER_SEC = 0.22;
/** Fraction of post-spin-up time spent at peak blur. */
const CRUISE_TIME_FRACTION = 0.2;
/** Fraction of post-spin-up time for the final slow crawl. */
const CRAWL_TIME_FRACTION = 0.42;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Cubic ease-in spin-up: s=t³.
 * End speed 3D/T matches peak when D = peak * T / 3.
 */
function spinUpDistanceForPeak(peakDegPerMs: number, spinUpMs: number): number {
  return (peakDegPerMs * spinUpMs) / 3;
}

/**
 * Smooth linear velocity blend from v0 → v1 over T.
 * Distance = T * (v0 + v1) / 2 — velocity continuous at both ends.
 */
function blendDistance(
  startDegPerMs: number,
  endDegPerMs: number,
  durationMs: number,
): number {
  return ((startDegPerMs + endDegPerMs) * durationMs) / 2;
}

/** Normalized progress for linear velocity blend v0→v1. */
function blendProgress(t: number, v0: number, v1: number): number {
  if (v0 + v1 <= 0) return t;
  // s(t)/s(1) with v(t)=(1-t)v0 + t v1
  return (2 * v0 * t + (v1 - v0) * t * t) / (v0 + v1);
}

/**
 * Absolute CSS rotation (clockwise positive) that puts slot `index`
 * under the top pointer. Slot 0 → 0°, slot 1 → -40°, etc.
 * Callers should add 360° × N for multi-turn spins.
 */
export function lucky77LandingRotation(slotIndex: number): number {
  const normalized =
    ((Math.floor(slotIndex) % LUCKY_77_SLOT_COUNT) + LUCKY_77_SLOT_COUNT) %
    LUCKY_77_SLOT_COUNT;
  return -(normalized * LUCKY_77_SLOT_DEGREES);
}

/**
 * Extra full clockwise turns scaled to draw duration.
 * Enough revolutions to feed an extreme peak blur without scaling it down.
 */
export function lucky77ExtraTurns(
  durationMs: number,
  roundId?: string | null,
): number {
  const base = clamp(Math.round(durationMs / 320), 10, 28);
  if (!roundId) return base;
  const jitter = hashSeed(roundId) % 3;
  return base + jitter;
}

/**
 * Shortest clockwise distance from `fromRotation` to a congruent landing angle.
 * Always returns a non-negative delta so the wheel never reverses.
 */
export function lucky77ClockwiseDelta(
  fromRotation: number,
  landingBase: number,
  extraTurns: number,
): number {
  const turns = Math.max(0, Math.floor(extraTurns));
  // Normalize so target is always strictly ahead of fromRotation.
  let target = landingBase;
  while (target <= fromRotation) {
    target += 360;
  }
  // Prefer at least `turns` full revolutions of travel.
  const minTravel = turns * 360;
  while (target - fromRotation < minTravel) {
    target += 360;
  }
  return target - fromRotation;
}

export type Lucky77SpinPhase = "idle" | "drawing" | "landed";

export type Lucky77SpinInput = {
  phase: Lucky77SpinPhase;
  drawingStartedAt?: string | null;
  resultRevealAt?: string | null;
  serverOffsetMs?: number;
  winningSlotIndex?: number | null;
  /** Absolute rotation when this draw began (or current idle angle). */
  fromRotation: number;
  roundId?: string | null;
  /** When true, snap to landing with no motion. */
  reducedMotion?: boolean;
  /** Client wall-clock override (tests). Defaults to Date.now(). */
  nowMs?: number;
};

export type Lucky77SpinOutput = {
  rotation: number;
  progress: number;
  /** True once the wheel has crawled onto the winner (final highlight window). */
  showWinnerHighlight: boolean;
  sectorIndex: number;
};

function serverNow(serverOffsetMs: number | undefined, nowMs?: number): number {
  return (nowMs ?? Date.now()) + (serverOffsetMs ?? 0);
}

/**
 * Deterministic wheel angle from shared server timestamps.
 * All clients with the same inputs produce the same rotation.
 */
export function lucky77SpinRotation({
  phase,
  drawingStartedAt,
  resultRevealAt,
  serverOffsetMs,
  winningSlotIndex,
  fromRotation,
  roundId,
  reducedMotion = false,
  nowMs,
}: Lucky77SpinInput): Lucky77SpinOutput {
  const hasStop =
    typeof winningSlotIndex === "number" &&
    Number.isFinite(winningSlotIndex) &&
    winningSlotIndex >= 0;

  const landingBase = hasStop
    ? lucky77LandingRotation(winningSlotIndex!)
    : fromRotation;

  const sectorFromRotation = (degrees: number): number => {
    // Pointer is fixed at top; which slot is under it?
    const unwrapped = ((-degrees % 360) + 360) % 360;
    return Math.floor(unwrapped / LUCKY_77_SLOT_DEGREES) % LUCKY_77_SLOT_COUNT;
  };

  if (phase === "landed" && hasStop) {
    // Keep multi-turn absolute angle nearest to fromRotation for continuity.
    let landed = landingBase;
    while (landed < fromRotation - 180) landed += 360;
    while (landed > fromRotation + 180) landed -= 360;
    // Prefer the clockwise-reached target if fromRotation was mid-spin.
    if (landed < fromRotation) landed += 360;
    return {
      rotation: landed,
      progress: 1,
      showWinnerHighlight: true,
      sectorIndex: Math.floor(winningSlotIndex!) % LUCKY_77_SLOT_COUNT,
    };
  }

  if (phase !== "drawing" || !hasStop) {
    return {
      rotation: fromRotation,
      progress: 0,
      showWinnerHighlight: false,
      sectorIndex: sectorFromRotation(fromRotation),
    };
  }

  const startedMs = drawingStartedAt
    ? new Date(drawingStartedAt).getTime()
    : Number.NaN;
  const revealMs = resultRevealAt
    ? new Date(resultRevealAt).getTime()
    : Number.NaN;

  if (!Number.isFinite(startedMs) || !Number.isFinite(revealMs) || revealMs <= startedMs) {
    return {
      rotation: landingBase,
      progress: 1,
      showWinnerHighlight: true,
      sectorIndex: Math.floor(winningSlotIndex!) % LUCKY_77_SLOT_COUNT,
    };
  }

  const durationMs = revealMs - startedMs;
  const now = serverNow(serverOffsetMs, nowMs);
  const elapsedMs = clamp(now - startedMs, 0, durationMs);
  const remainingMs = Math.max(0, revealMs - now);
  const progress = clamp(elapsedMs / durationMs, 0, 1);

  if (reducedMotion) {
    return {
      rotation: landingBase,
      progress: 1,
      showWinnerHighlight: true,
      sectorIndex: Math.floor(winningSlotIndex!) % LUCKY_77_SLOT_COUNT,
    };
  }

  const extraTurns = lucky77ExtraTurns(durationMs, roundId);
  const totalDelta = lucky77ClockwiseDelta(fromRotation, landingBase, extraTurns);
  const targetRotation = fromRotation + totalDelta;

  // Continuous-velocity profile with absolute peak/crawl speeds:
  // snap → extreme blur → smooth settle → very slow crawl → stop at 0s.
  const spinUpMs = clamp(
    durationMs * 0.04,
    SPIN_UP_MIN_MS,
    Math.min(SPIN_UP_MAX_MS, durationMs * 0.12),
  );
  const afterSpinUpMs = Math.max(1, durationMs - spinUpMs);
  const crawlMs = clamp(
    afterSpinUpMs * CRAWL_TIME_FRACTION,
    1_800,
    afterSpinUpMs * 0.55,
  );
  const cruiseMs = clamp(
    afterSpinUpMs * CRUISE_TIME_FRACTION,
    220,
    Math.max(220, afterSpinUpMs - crawlMs - 600),
  );
  const settleMs = Math.max(1, afterSpinUpMs - cruiseMs - crawlMs);

  const crawlDegPerMs = (CRAWL_REV_PER_SEC * 360) / 1000;
  // Solve peak so natural travel exactly fills totalDelta (keeps joins smooth).
  // total = peak*spinUp/3 + peak*cruise + settle*(peak+crawl)/2 + crawlMs*crawl/2
  const crawlBudget =
    (settleMs * crawlDegPerMs) / 2 + (crawlMs * crawlDegPerMs) / 2;
  const peakCoeff = spinUpMs / 3 + cruiseMs + settleMs / 2;
  const solvedPeak =
    peakCoeff > 0
      ? Math.max(0, (totalDelta - crawlBudget) / peakCoeff)
      : 0;
  // Never slower than a strong blur; if turns are scarce, clamp and accept scale.
  const minPeak = (6.5 * 360) / 1000;
  const maxPeak = (PEAK_REV_PER_SEC * 360) / 1000;
  const peakDegPerMs = clamp(solvedPeak, minPeak, maxPeak);

  const naturalSpinUp = spinUpDistanceForPeak(peakDegPerMs, spinUpMs);
  const naturalCruise = peakDegPerMs * cruiseMs;
  const naturalSettle = blendDistance(peakDegPerMs, crawlDegPerMs, settleMs);
  const naturalCrawl = blendDistance(crawlDegPerMs, 0, crawlMs);
  const naturalTotal =
    naturalSpinUp + naturalCruise + naturalSettle + naturalCrawl;
  // Tiny scale only when peak hit the clamp ceiling/floor.
  const scale = naturalTotal > 0 ? totalDelta / naturalTotal : 1;

  const spinUpDistance = naturalSpinUp * scale;
  const cruiseDistance = naturalCruise * scale;
  const settleDistance = naturalSettle * scale;
  const crawlDistance = naturalCrawl * scale;

  const spinUpEnd = spinUpMs;
  const cruiseEnd = spinUpEnd + cruiseMs;
  const settleEnd = cruiseEnd + settleMs;

  let rotation: number;
  if (elapsedMs <= spinUpEnd && spinUpMs > 0) {
    const t = elapsedMs / spinUpMs;
    rotation = fromRotation + spinUpDistance * t * t * t;
  } else if (elapsedMs <= cruiseEnd && cruiseMs > 0) {
    const t = (elapsedMs - spinUpEnd) / cruiseMs;
    rotation = fromRotation + spinUpDistance + cruiseDistance * t;
  } else if (elapsedMs <= settleEnd && settleMs > 0) {
    const t = (elapsedMs - cruiseEnd) / settleMs;
    rotation =
      fromRotation +
      spinUpDistance +
      cruiseDistance +
      settleDistance * blendProgress(t, peakDegPerMs, crawlDegPerMs);
  } else {
    const t = clamp((elapsedMs - settleEnd) / crawlMs, 0, 1);
    rotation =
      fromRotation +
      spinUpDistance +
      cruiseDistance +
      settleDistance +
      crawlDistance * blendProgress(t, crawlDegPerMs, 0);
  }

  // Exact land only when the draw window ends — never freeze early.
  if (progress >= 1 || remainingMs <= 0) {
    rotation = targetRotation;
  }

  const showWinnerHighlight =
    remainingMs <= LUCKY_77_WIN_HIGHLIGHT_MS || progress >= 1;

  return {
    rotation,
    progress,
    showWinnerHighlight,
    sectorIndex: showWinnerHighlight
      ? Math.floor(winningSlotIndex!) % LUCKY_77_SLOT_COUNT
      : sectorFromRotation(rotation),
  };
}

/** Idle clockwise drift from a base rotation and elapsed client time. */
export function lucky77IdleRotation(
  baseRotation: number,
  elapsedMs: number,
): number {
  return baseRotation + (LUCKY_77_IDLE_DEG_PER_SEC * Math.max(0, elapsedMs)) / 1000;
}
