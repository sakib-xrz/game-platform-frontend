"use client";

import { useEffect, useMemo, useState } from "react";

export function useCountdown(targetIso: string | null | undefined, serverOffsetMs: number): number {
  const targetMs = useMemo(() => (targetIso ? new Date(targetIso).getTime() : 0), [targetIso]);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const update = () => {
      const serverNow = Date.now() + serverOffsetMs;
      setRemainingMs(targetMs ? Math.max(0, targetMs - serverNow) : 0);
    };

    const frame = window.requestAnimationFrame(update);
    const timer = targetMs ? window.setInterval(update, 100) : null;
    return () => {
      window.cancelAnimationFrame(frame);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [targetMs, serverOffsetMs]);

  return remainingMs;
}
