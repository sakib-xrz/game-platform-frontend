"use client";

import { useState } from "react";
import type { ReactNode } from "react";

const FALLBACK_ICON_BY_CODE: Record<string, string> = {
  FALCON: "🦅",
  TIGER: "🐯",
  PANDA: "🐼",
  LION: "🦁",
  SHARK: "🦈",
  DRAGON: "🐉",
  CROWN: "👑",
  DIAMOND: "💎",
};

const LOCAL_ART_BY_CODE: Record<string, string> = {
  FALCON: "/assets/greedy/falcon.png",
  TIGER: "/assets/greedy/tiger.png",
  PANDA: "/assets/greedy/panda.png",
  LION: "/assets/greedy/lion.png",
  SHARK: "/assets/greedy/shark.png",
  DRAGON: "/assets/greedy/dragon.png",
  CROWN: "/assets/greedy/crown.png",
  DIAMOND: "/assets/greedy/diamond.png",
};

export const getOptionEmoji = (code: string): string =>
  FALLBACK_ICON_BY_CODE[code.toUpperCase()] ?? "🎯";

export function OptionArtwork({ imageUrl, code, name, className = "" }: {
  imageUrl?: string | null;
  code: string;
  name: string;
  className?: string;
}): ReactNode {
  const resolvedImageUrl = imageUrl || LOCAL_ART_BY_CODE[code.toUpperCase()];
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (resolvedImageUrl && failedImageUrl !== resolvedImageUrl) {
    return (
      // Backend controls option image_url. The game intentionally allows dynamic, versioned artwork.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedImageUrl}
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFailedImageUrl(resolvedImageUrl)}
      />
    );
  }
  return (
    <span className={className} role="img" aria-label={name}>
      {getOptionEmoji(code)}
    </span>
  );
}
