"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function LeaderboardAvatar({
  displayName,
  avatarUrl,
  className,
  ringClassName,
}: {
  displayName: string;
  avatarUrl?: string | null;
  className?: string;
  ringClassName?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);

  return (
    <span className={cn("lb-avatar", className, ringClassName)}>
      {showImage ? (
        // Profile photos are host-provided and may be any CDN URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? undefined}
          alt=""
          aria-hidden="true"
          className="lb-avatar__image"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl ?? null)}
        />
      ) : (
        <span className="lb-avatar__fallback" aria-hidden="true">
          {initialsFromName(displayName)}
        </span>
      )}
    </span>
  );
}
