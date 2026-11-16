"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

type ClassicFoodPresentation = {
  name: string;
  emoji: string;
  art: string;
  placeholderNames: readonly string[];
};

const CLASSIC_FOODS = {
  HOT_DOG: {
    name: "Golden Banana",
    emoji: "🍌",
    art: "/assets/greedy-classic/hot-dog.png",
    placeholderNames: ["golden banana", "banana", "hot dog", "falcon"],
  },
  KEBAB: {
    name: "Fresh Coconut",
    emoji: "🥥",
    art: "/assets/greedy-classic/kebab.png",
    placeholderNames: ["fresh coconut", "coconut", "barbecue kebab", "kebab", "tiger"],
  },
  HAM: {
    name: "Royal Pineapple",
    emoji: "🍍",
    art: "/assets/greedy-classic/ham.png",
    placeholderNames: ["royal pineapple", "pineapple", "ham", "panda"],
  },
  STEAK: {
    name: "Juicy Mango",
    emoji: "🥭",
    art: "/assets/greedy-classic/steak.png",
    placeholderNames: ["juicy mango", "mango", "grilled steak", "steak", "lion"],
  },
  CARROT: {
    name: "Sweet Watermelon",
    emoji: "🍉",
    art: "/assets/greedy-classic/carrot.png",
    placeholderNames: ["sweet watermelon", "watermelon", "carrot", "shark"],
  },
  CORN: {
    name: "Jungle Starfruit",
    emoji: "⭐",
    art: "/assets/greedy-classic/corn.png",
    placeholderNames: ["jungle starfruit", "starfruit", "corn", "dragon"],
  },
  CABBAGE: {
    name: "Tropical Berries",
    emoji: "🍇",
    art: "/assets/greedy-classic/cabbage.png",
    placeholderNames: ["tropical berries", "berries", "cabbage", "crown"],
  },
  TOMATO: {
    name: "Monkey Crown Gem",
    emoji: "👑",
    art: "/assets/greedy-classic/tomato.png",
    placeholderNames: ["monkey crown gem", "crown gem", "tomato", "diamond"],
  },
} as const satisfies Record<string, ClassicFoodPresentation>;

type ClassicFoodCode = keyof typeof CLASSIC_FOODS;

const LEGACY_CLASSIC_FOOD_CODES: Record<string, ClassicFoodCode> = {
  FALCON: "HOT_DOG",
  TIGER: "KEBAB",
  PANDA: "HAM",
  LION: "STEAK",
  SHARK: "CARROT",
  DRAGON: "CORN",
  CROWN: "CABBAGE",
  DIAMOND: "TOMATO",
};

function resolveClassicFood(code: string): ClassicFoodPresentation | undefined {
  const normalizedCode = code.trim().toUpperCase();
  const foodCode = (normalizedCode in CLASSIC_FOODS
    ? normalizedCode
    : LEGACY_CLASSIC_FOOD_CODES[normalizedCode]) as ClassicFoodCode | undefined;
  return foodCode ? CLASSIC_FOODS[foodCode] : undefined;
}

export function getClassicOptionDisplayName(
  code: string,
  backendName: string,
  imageUrl?: string | null,
): string {
  const presentation = resolveClassicFood(code);
  if (!presentation || imageUrl?.trim()) return backendName;

  const normalizedName = backendName.trim().toLowerCase();
  return (presentation.placeholderNames as readonly string[]).includes(normalizedName)
    ? presentation.name
    : backendName;
}

export function ClassicOptionArtwork({
  imageUrl,
  code,
  name,
  className = "",
}: {
  imageUrl?: string | null;
  code: string;
  name: string;
  className?: string;
}): ReactNode {
  const presentation = resolveClassicFood(code);
  const sources = useMemo(
    () => [imageUrl?.trim(), presentation?.art].filter(
      (source, index, values): source is string => Boolean(source) && values.indexOf(source) === index,
    ),
    [imageUrl, presentation?.art],
  );
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const source = sources.find((candidate) => !failedSources.has(candidate));

  if (source) {
    return (
      // Managed URLs are dynamic; the reviewed local cutout is the fallback.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt=""
        aria-hidden="true"
        className={className}
        draggable={false}
        referrerPolicy="no-referrer"
        onError={() => {
          setFailedSources((current) => new Set(current).add(source));
        }}
      />
    );
  }

  return (
    <span className={className} role="img" aria-label={name}>
      {presentation?.emoji ?? "🎯"}
    </span>
  );
}
