"use client";

import clsx from "clsx";
import { useCountdown } from "@/hooks/use-countdown";
import type { SnapshotRound } from "@/types/greedy";

function seconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

export function CenterStage({ round, serverOffsetMs }: { round: SnapshotRound | null; serverOffsetMs: number }) {
  const bettingMs = useCountdown(round?.betting_ends_at, serverOffsetMs);
  const drawingMs = useCountdown(round?.result_reveal_at, serverOffsetMs);

  const status = round?.status;
  const isBetting = status === "betting_open";
  const isDrawing = status === "drawing";
  const isPublicResult = Boolean(round?.result);

  let label = "Waiting";
  let value = "—";

  if (isBetting) {
    label = "Select time";
    value = `${seconds(bettingMs)}s`;
  } else if (status === "betting_locked" || status === "result_ready") {
    label = "Bets locked";
    value = "0s";
  } else if (isDrawing) {
    label = "The result is coming";
    value = String(Math.max(1, seconds(drawingMs)));
  } else if (isPublicResult) {
    label = "Winner";
    value = "✓";
  } else if (status === "cancelled") {
    label = "Round cancelled";
    value = "↻";
  }

  return (
    <div className={clsx("center-stage", isBetting && "center-stage--betting", isDrawing && "center-stage--drawing")}>
      <div className="center-stage__inner">
        {/* Decorative food-wheel centerpiece; outcome artwork remains server-driven in the result UI. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/greedy/center-feast.png" alt="" aria-hidden="true" className="center-stage__platter" />
        <div className="center-stage__copy">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    </div>
  );
}
