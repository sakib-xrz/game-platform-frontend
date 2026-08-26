"use client";

import Image from "next/image";
import Link from "next/link";
import { useGameBoot, type BootGame } from "@/components/game-boot-provider";
import { usePlayerHref } from "@/hooks/use-player-href";

type GameCardImage = {
  src: string;
  alt: string;
};

export type GameCardProps = {
  title: string;
  href: string;
  playerUserId?: string;
  variant: "greedy" | "greedy-classic" | "teen-patti" | "lucky-77";
  image: GameCardImage;
  priority?: boolean;
};

export function GameCard({
  title,
  href,
  playerUserId = "",
  variant,
  image,
  priority = false,
}: GameCardProps) {
  const { showBoot } = useGameBoot();
  const resolvedHref = usePlayerHref(href, playerUserId);

  if (!resolvedHref) return null;

  return (
    <Link
      href={resolvedHref}
      aria-label={`Open ${title}`}
      className="block overflow-hidden rounded-[22px] bg-[#160b24] shadow-lg transition-transform duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
      onNavigate={() => showBoot(variant satisfies BootGame)}
    >
      <span className="relative block aspect-[20/7] w-full">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 480px) calc(100vw - 30px), 450px"
          className="object-cover"
          priority={priority}
          draggable={false}
        />
      </span>
    </Link>
  );
}
