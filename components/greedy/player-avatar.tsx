"use client";

import clsx from "clsx";
import type { PlayerIdentity } from "@/types/greedy";

export function PlayerAvatar({
  player,
  className,
  decorative = true,
}: {
  player: Pick<PlayerIdentity, "user_id" | "display_name" | "avatar_url">;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <span
      className={clsx("player-avatar", className)}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${player.display_name || player.user_id} avatar`}
    >
      <span className="player-avatar__coin" aria-hidden="true">
        <span className="player-avatar__coin-mark">K</span>
      </span>
    </span>
  );
}
