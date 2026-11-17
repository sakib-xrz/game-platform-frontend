"use client";

import { Crown, Flame, Medal } from "lucide-react";
import { LeaderboardAvatar } from "@/components/leaderboard/leaderboard-avatar";
import {
  formatLeaderboardProfit,
  formatLeaderboardWins,
} from "@/lib/leaderboard-format";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/leaderboard";

function PodiumSlot({
  entry,
  rank,
}: {
  entry: LeaderboardEntry | undefined;
  rank: 1 | 2 | 3;
}) {
  const isCenter = rank === 1;
  const Icon = rank === 1 ? Crown : rank === 2 ? Medal : Flame;

  return (
    <div
      className={cn(
        "lb-podium__slot",
        `lb-podium__slot--${rank}`,
        isCenter && "lb-podium__slot--center",
        !entry && "lb-podium__slot--empty",
      )}
    >
      <div className="lb-podium__badge" aria-hidden="true">
        <Icon className="lb-podium__badge-icon" />
        {rank === 1 && entry ? <span className="lb-podium__sparks" /> : null}
      </div>

      {entry ? (
        <>
          <div className="lb-podium__avatar-wrap">
            {rank === 1 ? <span className="lb-podium__halo" aria-hidden="true" /> : null}
            <LeaderboardAvatar
              displayName={entry.displayName}
              avatarUrl={entry.avatarUrl}
              className={cn(
                "lb-podium__avatar",
                isCenter ? "lb-podium__avatar--lg" : "lb-podium__avatar--md",
              )}
            />
            <span className="lb-podium__rank-chip">{rank}</span>
          </div>
          <p className="lb-podium__name" title={entry.displayName}>
            {entry.displayName}
            {entry.isCurrentUser ? <span className="lb-you"> (You)</span> : null}
          </p>
          <p className="lb-podium__wins">{formatLeaderboardWins(entry.winCount)}</p>
          <p className="lb-podium__profit">{formatLeaderboardProfit(entry.netProfit)}</p>
        </>
      ) : (
        <div className="lb-podium__ghost" aria-hidden="true">
          <span className="lb-podium__ghost-orb" />
          <span className="lb-podium__ghost-rank">{rank}</span>
          <span className="lb-podium__ghost-line" />
          <span className="lb-podium__ghost-line lb-podium__ghost-line--short" />
        </div>
      )}
    </div>
  );
}

export function LeaderboardPodium({ entries }: { entries: LeaderboardEntry[] }) {
  const first = entries.find((entry) => entry.rank === 1) ?? entries[0];
  const second = entries.find((entry) => entry.rank === 2) ?? entries[1];
  const third = entries.find((entry) => entry.rank === 3) ?? entries[2];

  return (
    <div className="lb-podium" aria-label="Top three podium">
      <PodiumSlot entry={second} rank={2} />
      <PodiumSlot entry={first} rank={1} />
      <PodiumSlot entry={third} rank={3} />
    </div>
  );
}
