"use client";

import clsx from "clsx";
import { useCountdown } from "@/hooks/use-countdown";
import { getClassicOptionDisplayName } from "@/lib/greedy-classic-art";
import type { SnapshotRound } from "@/types/greedy";

function seconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1_000));
}

export function ClassicCenterDial({
  round,
  serverOffsetMs,
}: {
  round: SnapshotRound | null;
  serverOffsetMs: number;
}) {
  const bettingMs = useCountdown(round?.betting_ends_at, serverOffsetMs);
  const drawingMs = useCountdown(round?.result_reveal_at, serverOffsetMs);
  const status = round?.status;
  const isBetting = status === "betting_open";
  const isDrawing = status === "drawing";
  const winner = round?.result?.winning_option;

  let eyebrow = round ? `Round ${round.round_number}` : "Greedy Classic";
  let label = "Waiting for next round";
  let value = "—";

  if (isBetting) {
    label = "Place your bets";
    value = `${seconds(bettingMs)}s`;
  } else if (status === "betting_locked" || status === "result_ready") {
    label = "Bets locked";
    value = "0s";
  } else if (isDrawing) {
    label = "Drawing winner";
    value = `${Math.max(1, seconds(drawingMs))}s`;
  } else if (winner) {
    eyebrow = "Winning item";
    label = getClassicOptionDisplayName(
      winner.code,
      winner.name,
      winner.image_url,
    );
    value = "✓";
  } else if (status === "cancelled") {
    label = "Round cancelled";
    value = "↻";
  } else if (status === "settling" || status === "settled") {
    label = "Paying winners";
    value = "•••";
  }

  return (
    <div
      className={clsx(
        "gc-dial",
        isBetting && "gc-dial--betting",
        isDrawing && "gc-dial--drawing",
        winner && "gc-dial--result",
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${eyebrow}. ${label}.`}
    >
      <div className="gc-dial__inner" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/greedy-classic/center-feast.png"
          alt=""
          className="gc-dial__feast"
        />
        <div className="gc-dial__copy">
          <small>{eyebrow}</small>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    </div>
  );
}
