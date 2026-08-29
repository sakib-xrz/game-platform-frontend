"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";
import { getChipThemeForAmount } from "@/lib/chip-themes";
import type { PlayerIdentity } from "@/types/greedy";

export function PlayerAvatar({
  player,
  className,
  decorative = true,
  amount,
  fallbackIndex = 0,
}: {
  player: Pick<PlayerIdentity, "user_id" | "display_name" | "avatar_url">;
  className?: string;
  decorative?: boolean;
  amount?: string | number | bigint | null;
  fallbackIndex?: number;
}) {
  const theme = getChipThemeForAmount(amount, fallbackIndex);

  return (
    <span
      className={clsx("player-avatar", className)}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${player.display_name || player.user_id} bet coin`}
      style={{
        "--chip-rim": theme.rim,
        "--chip-core": theme.core,
        "--chip-ink": theme.ink,
      } as CSSProperties}
    >
      <span className="player-avatar__coin" aria-hidden="true">
        <span className="player-avatar__coin-rim" />
        <span className="player-avatar__coin-core" />
      </span>
    </span>
  );
}
