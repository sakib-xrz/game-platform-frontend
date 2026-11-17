"use client";

import { Trophy } from "lucide-react";
import { LeaderboardDialog } from "@/components/leaderboard/leaderboard-dialog";
import type { GameSoundCue } from "@/hooks/use-game-sound";

export function GreedyLeaderboardModal({
  open,
  onClose,
  playSound,
}: {
  open: boolean;
  onClose: () => void;
  currentUserId?: string;
  playSound?: (cue: GameSoundCue) => void;
}) {
  return (
    <LeaderboardDialog
      open={open}
      onClose={onClose}
      gameCode="greedy"
      theme="greedy"
      title="Daily High Rollers"
      subtitle="Safari wheel · daily top winners"
      playSound={playSound}
      headerAccessory={<Trophy className="h-4 w-4" />}
    />
  );
}
