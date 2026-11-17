"use client";

import { useEffect, useRef, useState } from "react";
import {
  greedyDrawFocusIndex,
  resolveGreedyDrawStopIndex,
} from "@/lib/greedy-draw-focus";

type DrawFocusArgs = {
  isDrawing: boolean;
  optionCount: number;
  durationMs: number;
  drawingMs: number;
  winningOptionIndex?: number | null;
  winnerId?: string | null;
  options: Array<{ id: string }>;
  drawingStartedAt?: string | null;
  resultRevealAt?: string | null;
  serverOffsetMs?: number;
};

/**
 * Drives the wheel/card highlight on every animation frame while drawing so
 * the ease-out trajectory never skips a card. After the draw, holds on the
 * winner until the next round clears the stop index.
 */
export function useGreedyDrawFocus({
  isDrawing,
  optionCount,
  durationMs,
  drawingMs,
  winningOptionIndex,
  winnerId,
  options,
  drawingStartedAt,
  resultRevealAt,
  serverOffsetMs = 0,
}: DrawFocusArgs): number {
  const drawStopIndex = resolveGreedyDrawStopIndex({
    winningOptionIndex,
    winnerId,
    options,
  });
  const heldIndex = drawStopIndex !== null ? drawStopIndex : -1;

  const drawingMsRef = useRef(drawingMs);
  useEffect(() => {
    drawingMsRef.current = drawingMs;
  }, [drawingMs]);

  const [drawingIndex, setDrawingIndex] = useState(() =>
    greedyDrawFocusIndex({
      isDrawing: true,
      optionCount,
      durationMs,
      drawingMs,
      stopIndex: drawStopIndex,
      drawingStartedAt,
      resultRevealAt,
      serverOffsetMs,
    }),
  );

  useEffect(() => {
    if (!isDrawing) return;

    let frameId = 0;
    const tick = () => {
      const next = greedyDrawFocusIndex({
        isDrawing: true,
        optionCount,
        durationMs,
        drawingMs: drawingMsRef.current,
        stopIndex: drawStopIndex,
        drawingStartedAt,
        resultRevealAt,
        serverOffsetMs,
      });
      setDrawingIndex((prev) => (prev === next ? prev : next));
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    isDrawing,
    optionCount,
    durationMs,
    drawStopIndex,
    drawingStartedAt,
    resultRevealAt,
    serverOffsetMs,
  ]);

  return isDrawing ? drawingIndex : heldIndex;
}
