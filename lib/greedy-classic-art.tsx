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
    name: "Hot dog",
    emoji: "🌭",
    art: "/assets/greedy-classic/hot-dog.png",
    placeholderNames: ["hot dog", "falcon"],
  },
  KEBAB: {
    name: "Barbecue kebab",
    emoji: "🍢",
    art: "/assets/greedy-classic/kebab.png",
    placeholderNames: ["barbecue kebab", "kebab", "tiger"],
  },
  HAM: {
    name: "Ham",
    emoji: "🍖",
    art: "/assets/greedy-classic/ham.png",
    placeholderNames: ["ham", "panda"],
  },
  STEAK: {
    name: "Grilled steak",
    emoji: "🥩",
    art: "/assets/greedy-classic/steak.png",
    placeholderNames: ["grilled steak", "steak", "lion"],
  },
  CARROT: {
    name: "Carrot",
    emoji: "🥕",
    art: "/assets/greedy-classic/carrot.png",
    placeholderNames: ["carrot", "shark"],
  },
  CORN: {
    name: "Corn",
    emoji: "🌽",
    art: "/assets/greedy-classic/corn.png",
    placeholderNames: ["corn", "dragon"],
  },
  CABBAGE: {
    name: "Cabbage",
    emoji: "🥬",
    art: "/assets/greedy-classic/cabbage.png",
    placeholderNames: ["cabbage", "crown"],
  },
  TOMATO: {
    name: "Tomato",
    emoji: "🍅",
    art: "/assets/greedy-classic/tomato.png",
    placeholderNames: ["tomato", "diamond"],
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
