"use client";

import clsx from "clsx";
import { useCountdown } from "@/hooks/use-countdown";
import type { SnapshotRound, TeenPattiConfig } from "@/types/teen-patti";

type PhaseTiming = Pick<TeenPattiConfig, "betting_duration_ms" | "drawing_duration_ms">;

function seconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

/**
 * Phase indicator that shows a full round timeline (betting → dealing →
 * reveal) with a smoothly filling ring for the current phase.
 */
export function TeenPattiPhaseRing({
  round,
  config,
  serverOffsetMs,
}: {
  round: SnapshotRound | null;
  config: PhaseTiming;
  serverOffsetMs: number;
}) {
  const status = round?.status ?? "idle";
  const isBetting = status === "betting_open";
  const isDrawing = status === "drawing";
  const isFinished =
    status === "result_revealed" ||
    status === "settling" ||
    status === "settled" ||
    status === "closed";

  const bettingRemaining = useCountdown(isBetting ? round?.betting_ends_at : null, serverOffsetMs);
  const drawingRemaining = useCountdown(isDrawing ? round?.result_reveal_at : null, serverOffsetMs);

  let label = "Waiting";
  let value = "—";
  let percent = 0;
  let tone: "wait" | "bet" | "deal" | "reveal" | "done" | "stopped" = "wait";

  if (!round) {
    label = "Get ready";
    value = "…";
    tone = "wait";
  } else if (isBetting) {
    label = "Betting open";
    value = `${seconds(bettingRemaining)}s`;
    percent = 1 - Math.min(1, bettingRemaining / Math.max(1, config.betting_duration_ms));
    tone = "bet";
  } else if (status === "betting_locked" || status === "result_ready") {
    label = "Dealing cards";
    value = "…";
    percent = 1;
    tone = "deal";
  } else if (isDrawing) {
    label = "Turning cards";
    value = `${Math.max(1, seconds(drawingRemaining))}s`;
    percent = 1 - Math.min(1, drawingRemaining / Math.max(1, config.drawing_duration_ms));
    tone = "reveal";
  } else if (isFinished) {
    label = "Winning hand";
    value = round.result?.winning_option.name ?? "—";
    percent = 1;
    tone = "done";
  } else if (status === "cancelled") {
    label = "Round cancelled";
    value = "↻";
    tone = "stopped";
  }

  const dash = 100;
  const filled = Math.max(0, Math.min(1, percent)) * dash;

  return (
    <div className={clsx("tp-phase", `tp-phase--${tone}`)}>
      <span className="sr-only" aria-live="polite">
        {isBetting || isDrawing ? label : `${label}: ${value}`}
      </span>
      <div className="tp-phase__ring" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <circle className="tp-phase__ring-track" cx="18" cy="18" r="15.915" />
          <circle
            className="tp-phase__ring-fill"
            cx="18"
            cy="18"
            r="15.915"
            strokeDasharray={`${filled} ${dash - filled}`}
            strokeDashoffset="25"
          />
        </svg>
        <span className="tp-phase__ring-dot" />
      </div>
      <div className="tp-phase__copy" aria-hidden="true">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
