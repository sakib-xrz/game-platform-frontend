"use client";

import { Trophy } from "lucide-react";

export function LeaderboardEmptyBoard({
  periodLabel,
}: {
  periodLabel: "today" | "yesterday";
}) {
  const isToday = periodLabel === "today";

  return (
    <div className="lb-empty-board" role="status">
      <div className="lb-empty-board__orb" aria-hidden="true">
        <span className="lb-empty-board__ring" />
        <span className="lb-empty-board__ring lb-empty-board__ring--delay" />
        <Trophy className="lb-empty-board__icon" />
      </div>
      <h3 className="lb-empty-board__title">
        {isToday ? "The board is open" : "No champions recorded"}
      </h3>
      <p className="lb-empty-board__copy">
        {isToday
          ? "Win a round today and your name takes the podium."
          : "Yesterday had no ranked winners. Check today’s board."}
      </p>
    </div>
  );
}
