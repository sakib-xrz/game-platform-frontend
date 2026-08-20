"use client";

import Image from "next/image";
import { useState } from "react";

type SeatAvatarProps = {
  imageUrl?: string | null;
  fallbackSrc: string;
  className?: string;
};

/**
 * Teen Patti options may eventually provide operator-managed artwork. Until
 * then, every seat has an original local royal avatar instead of a blank disc.
 */
export function SeatAvatar({ imageUrl, fallbackSrc, className }: SeatAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (imageUrl && failedImageUrl !== imageUrl) {
    return (
      // The backend owns versioned option art, so remote images intentionally
      // use the native element and gracefully fall back when a URL is invalid.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => setFailedImageUrl(imageUrl)}
      />
    );
  }

  return (
    <Image
      src={fallbackSrc}
      alt=""
      aria-hidden="true"
      width={384}
      height={384}
      sizes="72px"
      className={className}
      draggable={false}
    />
  );
}
