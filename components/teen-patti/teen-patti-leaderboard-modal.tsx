"use client";

import { Crown, Spade } from "lucide-react";
import { LeaderboardDialog } from "@/components/leaderboard/leaderboard-dialog";
import type { GameSoundCue } from "@/hooks/use-game-sound";

export function TeenPattiLeaderboardModal({
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
      gameCode="teen-patti"
      theme="teen-patti"
      title="Diwan-e-Khas Champions"
      subtitle="Royal cardroom · gold foil crests"
      playSound={playSound}
      headerAccessory={
        <span className="relative inline-flex">
          <Crown className="h-4 w-4" />
          <Spade className="absolute -bottom-1 -right-2 h-3 w-3 text-[#f5c518]" />
        </span>
      }
    />
  );
}
