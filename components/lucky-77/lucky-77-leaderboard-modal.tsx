"use client";

import { Sparkles, Zap } from "lucide-react";
import { LeaderboardDialog } from "@/components/leaderboard/leaderboard-dialog";
import type { GameSoundCue } from "@/hooks/use-game-sound";

export function Lucky77LeaderboardModal({
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
      gameCode="lucky-77"
      theme="lucky-77"
      title="Vegas 77 Jackpot Runners"
      subtitle="Marquee neon · high-voltage board"
      playSound={playSound}
      headerAccessory={
        <span className="relative inline-flex">
          <Zap className="h-4 w-4" />
          <Sparkles className="absolute -right-2 -top-2 h-3 w-3 animate-pulse text-[#ffd24d]" />
        </span>
      }
    />
  );
}
