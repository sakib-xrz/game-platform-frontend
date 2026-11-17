"use client";

import { LeaderboardAvatar } from "@/components/leaderboard/leaderboard-avatar";
import {
  formatLeaderboardEarnings,
  formatLeaderboardWins,
} from "@/lib/leaderboard-format";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

export function LeaderboardRankList({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  if (!entries.length) return null;

  return (
    <div className="lb-rank-list">
      <div className="lb-rank-list__head">
        <span>Rank &amp; Player</span>
        <span>Net Earnings</span>
      </div>
      <ul className="lb-rank-list__rows">
        {entries.map((entry) => {
          const highlighted = entry.rank >= 4 && entry.rank <= 10;
          return (
            <li
              key={`${entry.userId}-${entry.rank}`}
              className={cn(
                "lb-rank-row",
                highlighted && "lb-rank-row--hot",
                entry.isCurrentUser && "lb-rank-row--you",
              )}
            >
              <div className="lb-rank-row__left">
                <span
                  className={cn(
                    "lb-rank-row__badge",
                    highlighted && "lb-rank-row__badge--hot",
                  )}
                >
                  #{entry.rank}
                </span>
                <LeaderboardAvatar
                  displayName={entry.displayName}
                  avatarUrl={entry.avatarUrl}
                  className="lb-rank-row__avatar"
                />
                <div className="lb-rank-row__meta">
                  <p className="lb-rank-row__name" title={entry.displayName}>
                    {entry.displayName}
                    {entry.isCurrentUser ? (
                      <span className="lb-you"> (You)</span>
                    ) : null}
                  </p>
                  <p className="lb-rank-row__wins">
                    {formatLeaderboardWins(entry.winCount)}
                  </p>
                </div>
              </div>
              <div className="lb-rank-row__right">
                <span className="lb-rank-row__earnings">
                  {formatLeaderboardEarnings(entry.netProfit)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
