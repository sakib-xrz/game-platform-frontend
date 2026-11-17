"use client";

import { Crown, Ribbon } from "lucide-react";
import { LeaderboardDialog } from "@/components/leaderboard/leaderboard-dialog";
import type { GameSoundCue } from "@/hooks/use-game-sound";

export function ClassicLeaderboardModal({
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
      gameCode="greedy-classic"
      theme="classic"
      title="VIP Salon Leaders"
      subtitle="Velvet salon · antique gold ranks"
      playSound={playSound}
      headerAccessory={
        <span className="relative inline-flex">
          <Crown className="h-4 w-4" />
          <Ribbon className="absolute -bottom-1 -right-2 h-3 w-3 text-[#f0c45c]" />
        </span>
      }
    />
  );
}
