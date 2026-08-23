"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
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

function useServerNow(serverOffsetMs: number, active: boolean): number | null {
  const [serverNow, setServerNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setServerNow(Date.now() + serverOffsetMs);
    const frame = window.requestAnimationFrame(update);
    const timer = active ? window.setInterval(update, 100) : null;
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [active, serverOffsetMs]);

  return serverNow;
}

function fallbackServerNow(round: SnapshotRound | null): number {
  if (!round) return 0;
  if (round.result) {
    return parseTime(round.result.revealed_at) || parseTime(round.result_reveal_at);
  }
  if (round.status === "drawing" || round.status === "result_ready") {
    return parseTime(round.drawing_started_at) || parseTime(round.betting_ends_at);
  }
  if (round.status === "betting_locked") return parseTime(round.betting_ends_at);
  return parseTime(round.betting_started_at) || parseTime(round.betting_ends_at);
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
    label: "Bets locked",
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
 * displayed second counter. The countdown is derived from immutable server
 * deadlines and a measured server-clock offset. When a deadline has passed
 * but the backend has not advanced the round yet, an indeterminate "…" state
 * is shown instead of a frozen "0s".
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
  const liveServerNow = useServerNow(serverOffsetMs, Boolean(round));
  const serverNow = liveServerNow ?? fallbackServerNow(round);
  const phase = resolvePhaseWindow(round, config, serverNow, gameStatus, runtimeStatus);

  const remainingMs = phase.endsAtMs ? Math.max(0, phase.endsAtMs - serverNow) : 0;
  const totalSeconds = Math.max(1, Math.round(phase.durationMs / 1000));
  const rawSeconds = phase.showSeconds ? secondsFromMs(remainingMs) : 0;

  const phaseKey = `${round?.id ?? "none"}:${phase.tone}`;
  const seconds = rawSeconds;

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

  return (
    <div className={clsx("tp-phase", `tp-phase--${phase.tone}`)}>
      <span className="sr-only" aria-live="polite">
        {counting ? `${phase.label}: ${seconds} seconds remaining` : `${phase.label}: ${value}`}
      </span>
      <div className="tp-phase__ring" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <circle className="tp-phase__ring-track" cx="18" cy="18" r="15.915" />
          <circle
            key={phaseKey}
            className="tp-phase__ring-fill"
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
