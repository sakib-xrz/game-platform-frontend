"use client";

import { LeaderboardAvatar } from "@/components/leaderboard/leaderboard-avatar";
import {
  formatLeaderboardEarnings,
  formatLeaderboardProfit,
} from "@/lib/leaderboard-format";
import type { CurrentUserStanding } from "@/types/leaderboard";

export function LeaderboardMyRankBar({
  currentUser,
  onKeepPlaying,
}: {
  currentUser: CurrentUserStanding | null;
  onKeepPlaying: () => void;
}) {
  if (!currentUser) {
    return (
      <div className="lb-my-rank lb-my-rank--guest">
        <div>
          <p className="lb-my-rank__label">Your Rank</p>
          <p className="lb-my-rank__value">Sign in while playing to track standing</p>
        </div>
        <button type="button" className="lb-my-rank__cta" onClick={onKeepPlaying}>
          Keep Playing
        </button>
      </div>
    );
  }

  return (
    <div className="lb-my-rank">
      <div className="lb-my-rank__identity">
        <span className="lb-my-rank__chip">
          {currentUser.rank ? `#${currentUser.rank}` : "—"}
        </span>
        <LeaderboardAvatar
          displayName={currentUser.displayName}
          avatarUrl={currentUser.avatarUrl}
          className="lb-my-rank__avatar"
        />
        <div className="lb-my-rank__copy">
          <p className="lb-my-rank__label">
            Your Rank:{" "}
            <strong>
              {currentUser.rank ? `#${currentUser.rank}` : "Unranked"}
            </strong>
          </p>
          <p className="lb-my-rank__stats">
            Bets {formatLeaderboardEarnings(currentUser.totalBet)} · Net{" "}
            {formatLeaderboardProfit(currentUser.netProfit)}
          </p>
        </div>
      </div>
      <button type="button" className="lb-my-rank__cta" onClick={onKeepPlaying}>
        Keep Playing
      </button>
    </div>
  );
}
