"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type FoodPresentation = {
  name: string;
  emoji: string;
  art: string;
};

const FOOD_PRESENTATIONS = {
  HOT_DOG: {
    name: "Hot dog",
    emoji: "🌭",
    art: "/assets/greedy/hot-dog.png",
  },
  KEBAB: {
    name: "Barbecue kebab",
    emoji: "🍢",
    art: "/assets/greedy/kebab.png",
  },
  HAM: {
    name: "Ham",
    emoji: "🍖",
    art: "/assets/greedy/ham.png",
  },
  STEAK: {
    name: "Grilled steak",
    emoji: "🥩",
    art: "/assets/greedy/steak.png",
  },
  CARROT: {
    name: "Carrot",
    emoji: "🥕",
    art: "/assets/greedy/carrot.png",
  },
  CORN: {
    name: "Corn",
    emoji: "🌽",
    art: "/assets/greedy/corn.png",
  },
  CABBAGE: {
    name: "Cabbage",
    emoji: "🥬",
    art: "/assets/greedy/cabbage.png",
  },
  TOMATO: {
    name: "Tomato",
    emoji: "🍅",
    art: "/assets/greedy/tomato.png",
  },
} as const satisfies Record<string, FoodPresentation>;

type FoodCode = keyof typeof FOOD_PRESENTATIONS;

// Older published configurations used animal codes. Keep those immutable
// identifiers compatible while presenting the food wheel requested for Greedy.
const LEGACY_FOOD_CODE: Record<string, FoodCode> = {
  FALCON: "HOT_DOG",
  TIGER: "KEBAB",
  PANDA: "HAM",
  LION: "STEAK",
  SHARK: "CARROT",
  DRAGON: "CORN",
  CROWN: "CABBAGE",
  DIAMOND: "TOMATO",
};

function resolveFood(code: string): FoodPresentation | undefined {
  const normalizedCode = code.toUpperCase();
  const foodCode = (normalizedCode in FOOD_PRESENTATIONS
    ? normalizedCode
    : LEGACY_FOOD_CODE[normalizedCode]) as FoodCode | undefined;
  return foodCode ? FOOD_PRESENTATIONS[foodCode] : undefined;
}

export const getOptionEmoji = (code: string): string =>
  resolveFood(code)?.emoji ?? "🎯";

export const getOptionDisplayName = (code: string, fallbackName: string): string =>
  resolveFood(code)?.name ?? fallbackName;

export function OptionArtwork({ imageUrl, code, name, className = "" }: {
  imageUrl?: string | null;
  code: string;
  name: string;
  className?: string;
}): ReactNode {
  // Recognized Greedy outcomes always use the bundled, reviewed food artwork.
  // Unknown future options can still use a managed backend image URL.
  const resolvedImageUrl = resolveFood(code)?.art || imageUrl;
  const displayName = getOptionDisplayName(code, name);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (resolvedImageUrl && failedImageUrl !== resolvedImageUrl) {
    return (
      // Unknown future options may still supply dynamic, versioned backend artwork.
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
    <span className={className} role="img" aria-label={displayName}>
      {getOptionEmoji(code)}
    </span>
  );
}
