"use client";

import { useEffect, useState } from "react";

function remainingMsFrom(targetIso: string | null | undefined, serverOffsetMs: number): number {
  if (!targetIso) return 0;
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return 0;
  return Math.max(0, targetMs - Date.now() - serverOffsetMs);
}

export function useCountdown(targetIso: string | null | undefined, serverOffsetMs: number): number {
  const [, setTick] = useState(0);

  useEffect(() => {
    const tick = () => setTick((value) => value + 1);
    tick();
    if (!targetIso) return;
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [targetIso, serverOffsetMs]);

  return remainingMsFrom(targetIso, serverOffsetMs);
}
