"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { useGameBoot, type BootGame } from "@/components/game-boot-provider";
import { usePlayerHref } from "@/hooks/use-player-href";

type GameCardImage = {
  src: string;
  alt?: string;
};

export type GameCardProps = {
  title: string;
  subtitle: string;
  href?: string;
  active?: boolean;
  accent: string;
  variant: "greedy" | "greedy-classic" | "teen-patti" | "lucky-77" | "soon";
  statusLabel?: string;
  meta?: string[];
  art?: string[];
  artImages?: GameCardImage[];
  centerImage?: GameCardImage;
  heroImage?: GameCardImage;
  priority?: boolean;
  /** From page `searchParams.user` so SSR links match the launch URL. */
  playerUserId?: string;
};

const ORBIT_POSITIONS = [
  "game-card__orbit-item--top",
  "game-card__orbit-item--right",
  "game-card__orbit-item--bottom",
  "game-card__orbit-item--left",
] as const;

export function GameCard({
  title,
  subtitle,
  href,
  active = false,
  accent,
  variant,
  statusLabel,
  meta = [],
  art = [],
  artImages = [],
  centerImage,
  heroImage,
  priority = false,
  playerUserId = "",
}: GameCardProps) {
  const [opening, setOpening] = useState(false);
  const { showBoot } = useGameBoot();
  const orbitItems = artImages.length > 0 ? artImages : art;
  // Keep ?user= on game links so WebView navigations never drop identity.
  const resolvedHref = usePlayerHref(href, playerUserId);

  function handleOpen() {
    setOpening(true);
    if (variant !== "soon") {
      showBoot(variant satisfies BootGame);
    }
  }

  const content = (
    <div
      className={`game-card game-card--${variant} arcade-card-glow ${active ? "game-card--active" : "game-card--locked"}`}
      style={{ "--game-card-accent": accent } as React.CSSProperties}
      aria-busy={opening || undefined}
    >
      <span className="game-card__shine" aria-hidden="true" />
      <span className="game-card__shade" aria-hidden="true" />
      <span className="game-card__pattern" aria-hidden="true" />

      {heroImage && (
        <div className="game-card__hero" aria-hidden="true">
          <Image
            src={heroImage.src}
            alt=""
            fill
            sizes="(max-width: 480px) 62vw, 280px"
            priority={priority}
            draggable={false}
          />
          <span />
        </div>
      )}

      <div className="game-card__content">
        <div className="game-card__copy">
          <div className="game-card__status">
            {active ? <Sparkles aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            {statusLabel ?? (active ? "Live now" : "Coming soon")}
          </div>
          <h2>{title}</h2>
          <p>{subtitle}</p>

          {meta.length > 0 && (
            <span className="game-card__meta" aria-label={meta.join(", ")}>
              {meta.map((item) => (
                <i key={item}>{item}</i>
              ))}
            </span>
          )}

          <span className="game-card__cta">
            {opening ? (
              <>
                <i className="game-card__spinner" aria-hidden="true" />
                Opening…
              </>
            ) : (
              <>
                {active ? "Play now" : "Locked"}
                {active && <ArrowRight aria-hidden="true" />}
              </>
            )}
          </span>
        </div>

        {!heroImage && (
          <div className="game-card__orbit" aria-hidden="true">
            <span className="game-card__orbit-ring" />
            {orbitItems.slice(0, 4).map((item, index) => {
              const image = typeof item === "string" ? null : item;
              const icon = typeof item === "string" ? item : null;
              return (
                <span
                  key={image ? image.src : `${item}-${index}`}
                  className={`game-card__orbit-item ${ORBIT_POSITIONS[index]}`}
                >
                  {image ? (
                    <Image
                      src={image.src}
                      alt=""
                      fill
                      sizes="38px"
                      draggable={false}
                    />
                  ) : icon}
                </span>
              );
            })}
            {centerImage ? (
              <span className="game-card__orbit-center game-card__orbit-center--image">
                <Image
                  src={centerImage.src}
                  alt=""
                  fill
                  sizes="70px"
                  priority={priority}
                  draggable={false}
                />
              </span>
            ) : (
              <span className="game-card__orbit-center">🎯</span>
            )}
          </div>
        )}
      </div>
      {opening && <span className="sr-only">Opening {title}</span>}
    </div>
  );

  return active && resolvedHref ? (
    <Link
      href={resolvedHref}
      aria-label={`Open ${title}`}
      className="game-card-link"
      onNavigate={handleOpen}
    >
      {content}
    </Link>
  ) : (
    <div aria-disabled="true" className="game-card-link">{content}</div>
  );
}
