import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  greedyDrawFocusIndex,
  resolveGreedyDrawStopIndex,
} from "@/lib/greedy-draw-focus";

const STARTED = "2026-11-17T12:00:00.000Z";
const startedMs = Date.parse(STARTED);

function revealAt(durationMs: number): string {
  return new Date(startedMs + durationMs).toISOString();
}

function focusAt(args: {
  elapsedMs: number;
  durationMs: number;
  stopIndex: number | null;
  optionCount?: number;
  serverOffsetMs?: number;
  drawingMs?: number;
  useTimestamps?: boolean;
}): number {
  const {
    elapsedMs,
    durationMs,
    stopIndex,
    optionCount = 8,
    serverOffsetMs = 0,
    drawingMs,
    useTimestamps = true,
  } = args;

  vi.setSystemTime(startedMs + elapsedMs - serverOffsetMs);

  return greedyDrawFocusIndex({
    isDrawing: true,
    optionCount,
    durationMs,
    drawingMs:
      drawingMs ??
      Math.max(0, durationMs - elapsedMs),
    stopIndex,
    drawingStartedAt: useTimestamps ? STARTED : null,
    resultRevealAt: useTimestamps ? revealAt(durationMs) : null,
    serverOffsetMs,
  });
}

function circularDelta(from: number, to: number, count: number): number {
  return (to - from + count) % count;
}

describe("greedyDrawFocusIndex", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(startedMs);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns -1 when not drawing or when optionCount is invalid", () => {
    expect(
      greedyDrawFocusIndex({
        isDrawing: false,
        optionCount: 8,
        durationMs: 3000,
        drawingMs: 1000,
        stopIndex: 3,
        drawingStartedAt: STARTED,
        resultRevealAt: revealAt(3000),
      }),
    ).toBe(-1);

    expect(
      greedyDrawFocusIndex({
        isDrawing: true,
        optionCount: 0,
        durationMs: 3000,
        drawingMs: 1000,
        stopIndex: 3,
      }),
    ).toBe(-1);
  });

  it("lands exactly on every stop index across draw durations", () => {
    const durations = [160, 900, 1800, 3000, 7500, 15_000, 30_000];
    for (const durationMs of durations) {
      for (let stopIndex = 0; stopIndex < 8; stopIndex += 1) {
        const landed = focusAt({
          elapsedMs: durationMs,
          durationMs,
          stopIndex,
        });
        expect(landed, `duration=${durationMs} stop=${stopIndex}`).toBe(
          stopIndex,
        );

        const settleEarly = focusAt({
          elapsedMs: durationMs - 100,
          durationMs,
          stopIndex,
        });
        expect(
          settleEarly,
          `early-settle duration=${durationMs} stop=${stopIndex}`,
        ).toBe(stopIndex);
      }
    }
  });

  it("advances at most one card per step and never reverses while decelerating", () => {
    const durationMs = 3000;
    const stopIndex = 5;
    const count = 8;
    let previous = focusAt({ elapsedMs: 0, durationMs, stopIndex });
    const changeTimes: number[] = [];

    for (let elapsedMs = 1; elapsedMs <= durationMs; elapsedMs += 1) {
      const current = focusAt({ elapsedMs, durationMs, stopIndex });
      if (current !== previous) {
        const delta = circularDelta(previous, current, count);
        expect(delta).toBe(1);
        changeTimes.push(elapsedMs);
        previous = current;
      }
    }

    expect(previous).toBe(stopIndex);
    expect(changeTimes.length).toBeGreaterThan(8);

    for (let i = 2; i < changeTimes.length; i += 1) {
      const prevInterval = changeTimes[i - 1]! - changeTimes[i - 2]!;
      const interval = changeTimes[i]! - changeTimes[i - 1]!;
      expect(interval).toBeGreaterThanOrEqual(prevInterval - 1);
    }
  });

  it("holds on the winner through the final settle window and beyond reveal", () => {
    const durationMs = 3000;
    const stopIndex = 2;
    expect(focusAt({ elapsedMs: durationMs - 50, durationMs, stopIndex })).toBe(
      2,
    );
    expect(focusAt({ elapsedMs: durationMs, durationMs, stopIndex })).toBe(2);
    expect(focusAt({ elapsedMs: durationMs + 500, durationMs, stopIndex })).toBe(
      2,
    );
  });

  it("falls back to a linear sequence when stop index is unknown", () => {
    expect(focusAt({ elapsedMs: 0, durationMs: 3000, stopIndex: null })).toBe(
      0,
    );
    expect(focusAt({ elapsedMs: 160, durationMs: 3000, stopIndex: null })).toBe(
      1,
    );
    expect(focusAt({ elapsedMs: 320, durationMs: 3000, stopIndex: null })).toBe(
      2,
    );
    expect(
      focusAt({ elapsedMs: 1280, durationMs: 3000, stopIndex: null }),
    ).toBe(0);
  });

  it("respects serverOffsetMs and the missing-timestamp path", () => {
    const durationMs = 3000;
    const stopIndex = 4;

    const withOffset = focusAt({
      elapsedMs: durationMs,
      durationMs,
      stopIndex,
      serverOffsetMs: 250,
    });
    expect(withOffset).toBe(stopIndex);

    vi.setSystemTime(startedMs + 2500);
    const withoutTimestamps = greedyDrawFocusIndex({
      isDrawing: true,
      optionCount: 8,
      durationMs,
      drawingMs: 500,
      stopIndex,
      drawingStartedAt: null,
      resultRevealAt: null,
      serverOffsetMs: 0,
    });
    expect(withoutTimestamps).toBeTypeOf("number");
    expect(withoutTimestamps).toBeGreaterThanOrEqual(0);
    expect(withoutTimestamps).toBeLessThan(8);

    const settledWithoutTimestamps = greedyDrawFocusIndex({
      isDrawing: true,
      optionCount: 8,
      durationMs,
      drawingMs: 0,
      stopIndex,
      drawingStartedAt: null,
      resultRevealAt: null,
    });
    expect(settledWithoutTimestamps).toBe(stopIndex);
  });
});

describe("resolveGreedyDrawStopIndex", () => {
  const options = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("prefers winner id, then winning option index, else null", () => {
    expect(
      resolveGreedyDrawStopIndex({
        winningOptionIndex: 1,
        winnerId: "c",
        options,
      }),
    ).toBe(2);

    expect(
      resolveGreedyDrawStopIndex({
        winningOptionIndex: 1,
        winnerId: null,
        options,
      }),
    ).toBe(1);

    expect(
      resolveGreedyDrawStopIndex({
        winningOptionIndex: 9,
        winnerId: null,
        options,
      }),
    ).toBe(1);

    expect(
      resolveGreedyDrawStopIndex({
        winningOptionIndex: null,
        winnerId: "missing",
        options,
      }),
    ).toBeNull();

    expect(
      resolveGreedyDrawStopIndex({
        winningOptionIndex: null,
        winnerId: null,
        options,
      }),
    ).toBeNull();
  });
});
