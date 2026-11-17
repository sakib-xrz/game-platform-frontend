"use client";

import { formatResetCountdown } from "@/lib/leaderboard-format";
import { cn } from "@/lib/utils";
import type { LeaderboardPeriod } from "@/types/leaderboard";

export function LeaderboardTabs({
  period,
  resetRemainingMs,
  onPeriodChange,
}: {
  period: LeaderboardPeriod;
  resetRemainingMs: number;
  onPeriodChange: (period: LeaderboardPeriod) => void;
}) {
  return (
    <div className="lb-tabs" role="tablist" aria-label="Leaderboard period">
      <button
        type="button"
        role="tab"
        aria-selected={period === "today"}
        className={cn("lb-tabs__tab", period === "today" && "is-active")}
        onClick={() => onPeriodChange("today")}
      >
        Today
        {resetRemainingMs > 0 ? (
          <span className="lb-tabs__sub">
            Resets in {formatResetCountdown(resetRemainingMs)}
          </span>
        ) : (
          <span className="lb-tabs__sub">Live daily board</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={period === "yesterday"}
        className={cn("lb-tabs__tab", period === "yesterday" && "is-active")}
        onClick={() => onPeriodChange("yesterday")}
      >
        Yesterday&apos;s Champions
      </button>
    </div>
  );
}
