"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { UserRound } from "lucide-react";
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
  const [failedUrl, setFailedUrl] = useState("");
  const avatarUrl = player.avatar_url?.trim() || "";
  const imageFailed = Boolean(avatarUrl) && failedUrl === avatarUrl;

  return (
    <span
      className={clsx("player-avatar", className)}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${player.display_name || player.user_id} avatar`}
    >
      {avatarUrl && !imageFailed ? (
        <Image
          src={avatarUrl}
          alt=""
          width={64}
          height={64}
          sizes="64px"
          unoptimized
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <UserRound aria-hidden="true" className="player-avatar__fallback" />
      )}
    </span>
  );
}
