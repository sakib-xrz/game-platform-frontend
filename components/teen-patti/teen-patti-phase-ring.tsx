"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type {
  GameStatus,
  RuntimeStatus,
  SnapshotRound,
  TeenPattiConfig,
} from "@/types/teen-patti";

type PhaseTiming = Pick<
  TeenPattiConfig,
  "betting_duration_ms" | "lock_duration_ms" | "drawing_duration_ms" | "result_duration_ms"
>;

type PhaseTone = "wait" | "bet" | "deal" | "reveal" | "done" | "stopped";

type PhaseWindow = {
  label: string;
  detail: string;
  tone: PhaseTone;
  endsAtMs: number;
  durationMs: number;
  showSeconds: boolean;
};

const RING_LENGTH = 100;

function secondsFromMs(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function useServerNow(serverOffsetMs: number, active: boolean): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 100);
    return () => window.clearInterval(timer);
  }, [active, serverOffsetMs]);

  return Date.now() + serverOffsetMs;
}

function resolvePhaseWindow(
  round: SnapshotRound | null,
  config: PhaseTiming,
  serverNow: number,
  gameStatus?: GameStatus,
  runtimeStatus?: RuntimeStatus,
): PhaseWindow {
  if (gameStatus && gameStatus !== "active") {
    return {
      label: gameStatus === "maintenance" ? "Table closed" : "Unavailable",
      detail: "—",
      tone: "stopped",
      endsAtMs: 0,
      durationMs: 0,
      showSeconds: false,
    };
  }

  if (!round) {
    const paused = runtimeStatus && runtimeStatus !== "running";
    return {
      label: paused ? (runtimeStatus === "paused" ? "Paused" : "Stopped") : "Get ready",
      detail: "…",
      tone: paused ? "stopped" : "wait",
      endsAtMs: 0,
      durationMs: 0,
      showSeconds: false,
    };
  }

  const status = round.status;
  const bettingMs = Math.max(1, round.betting_duration_ms || config.betting_duration_ms);
  const lockMs = Math.max(1, round.lock_duration_ms || config.lock_duration_ms);
  const drawMs = Math.max(1, round.drawing_duration_ms || config.drawing_duration_ms);
  const resultMs = Math.max(1, round.result_duration_ms || config.result_duration_ms);

  // Every deadline is derived from an absolute server timestamp so the
  // countdown is monotonic and can never run backwards between renders.
  const bettingEnds = parseTime(round.betting_ends_at)
    || (parseTime(round.betting_started_at) + bettingMs);
  const drawingStarts = parseTime(round.drawing_started_at)
    || (bettingEnds + lockMs);
  const revealAt = parseTime(round.result_reveal_at)
    || (drawingStarts + drawMs);
  const resultEnds = revealAt + resultMs;
  const revealed = Boolean(round.result)
    || status === "result_revealed"
    || status === "settling"
    || status === "settled"
    || status === "closed";

  if (status === "cancelled") {
    return {
      label: "Round cancelled",
      detail: "↻",
      tone: "stopped",
      endsAtMs: 0,
      durationMs: 0,
      showSeconds: false,
    };
  }

  if (revealed) {
    return {
      label: "Winning hand",
      detail: round.result?.winning_option.name ?? "—",
      tone: "done",
      endsAtMs: resultEnds,
      durationMs: resultMs,
      showSeconds: true,
    };
  }

  const turningCards: PhaseWindow = {
    label: "Turning cards",
    detail: "",
    tone: "reveal",
    endsAtMs: revealAt,
    durationMs: drawMs,
    showSeconds: true,
  };
  const dealingCards: PhaseWindow = {
    label: "Dealing cards",
    detail: "",
    tone: "deal",
    endsAtMs: drawingStarts,
    durationMs: lockMs,
    showSeconds: true,
  };

  if (status === "drawing" || status === "result_ready") {
    return turningCards;
  }

  if (status === "betting_locked") {
    return serverNow < drawingStarts ? dealingCards : turningCards;
  }

  if (status === "betting_open") {
    if (serverNow < bettingEnds) {
      return {
        label: "Betting open",
        detail: "",
        tone: "bet",
        endsAtMs: bettingEnds,
        durationMs: bettingMs,
        showSeconds: true,
      };
    }
    // Betting time is up but the worker has not locked yet: advance the
    // label locally instead of freezing on "Betting open 0s".
    return serverNow < drawingStarts ? dealingCards : turningCards;
  }

  return turningCards;
}

/**
 * Phase indicator with a countdown ring that drains in lockstep with the
 * displayed second counter. The countdown is derived purely from server
 * deadlines, so it is monotonic (never resets or counts up). When a deadline
 * has passed but the backend has not advanced the round yet, an indeterminate
 * "…" state is shown instead of a frozen "0s".
 */
export function TeenPattiPhaseRing({
  round,
  config,
  serverOffsetMs,
  gameStatus,
  runtimeStatus,
}: {
  round: SnapshotRound | null;
  config: PhaseTiming;
  serverOffsetMs: number;
  gameStatus?: GameStatus;
  runtimeStatus?: RuntimeStatus;
}) {
  const serverNow = useServerNow(serverOffsetMs, Boolean(round));
  const phase = resolvePhaseWindow(round, config, serverNow, gameStatus, runtimeStatus);

  const remainingMs = phase.endsAtMs ? Math.max(0, phase.endsAtMs - serverNow) : 0;
  const totalSeconds = Math.max(1, Math.round(phase.durationMs / 1000));
  const rawSeconds = phase.showSeconds ? secondsFromMs(remainingMs) : 0;

  // Monotonic latch: within a single round+phase the counter may only ever tick
  // down. This shields the display from a backend that re-emits a phase or
  // pushes its deadline forward (worker catching up), which would otherwise make
  // the countdown jump back up and repeat (e.g. 3,2,1,3,2,1).
  const phaseKey = `${round?.id ?? "none"}:${phase.tone}`;
  const latchRef = useRef<{ key: string; seconds: number } | null>(null);
  let seconds = rawSeconds;
  if (phase.showSeconds) {
    const latched = latchRef.current?.key === phaseKey
      ? latchRef.current.seconds
      : Number.POSITIVE_INFINITY;
    seconds = Math.min(rawSeconds, latched);
    latchRef.current = { key: phaseKey, seconds };
  } else if (latchRef.current?.key !== phaseKey) {
    latchRef.current = null;
  }

  // The timed window elapsed but the round has not moved on yet (worker catching
  // up): stop showing a hard number and fall back to an indeterminate marker.
  const awaitingServer = phase.showSeconds && seconds <= 0;
  const counting = phase.showSeconds && seconds > 0;

  const ratio = counting ? Math.min(1, seconds / totalSeconds) : 0;
  const filled = Math.max(0, Math.min(1, ratio)) * RING_LENGTH;
  const gap = RING_LENGTH - filled;

  let value: string;
  if (phase.detail) {
    value = phase.detail;
  } else if (counting) {
    value = `${seconds}s`;
  } else {
    value = "…";
  }
  const ringCount = counting ? String(seconds) : null;

  const prevSecondsRef = useRef<number | null>(null);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    prevSecondsRef.current = null;
    setTicking(false);
  }, [phaseKey]);

  useEffect(() => {
    const prev = prevSecondsRef.current;
    prevSecondsRef.current = seconds;
    // Animate the ring drain only on a genuine one-second tick down.
    setTicking(Boolean(counting && prev != null && prev - seconds === 1));
  }, [seconds, counting, phaseKey]);

  return (
    <div className={clsx("tp-phase", `tp-phase--${phase.tone}`)}>
      <span className="sr-only" aria-live="polite">
        {counting ? `${phase.label}: ${seconds} seconds remaining` : `${phase.label}: ${value}`}
      </span>
      <div className="tp-phase__ring" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <circle className="tp-phase__ring-track" cx="18" cy="18" r="15.915" />
          <circle
            className={clsx("tp-phase__ring-fill", !ticking && "is-snap")}
            cx="18"
            cy="18"
            r="15.915"
            strokeDasharray={`${filled} ${gap}`}
          />
        </svg>
        {ringCount ? (
          <span className="tp-phase__ring-count">{ringCount}</span>
        ) : (
          <span className={clsx("tp-phase__ring-dot", awaitingServer && "is-waiting")} />
        )}
      </div>
      <div className="tp-phase__copy" aria-hidden="true">
        <span>{phase.label}</span>
        <strong key={`${phase.label}:${value}`}>{value}</strong>
      </div>
    </div>
  );
}
