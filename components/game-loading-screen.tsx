import Image from "next/image";

type GameLoadingScreenProps = {
  game: "greedy" | "teen-patti";
  /** When true, sits as a fixed bottom half over whatever is behind it. */
  overlay?: boolean;
};

const GAME_META = {
  greedy: {
    title: "Greedy",
    label: "Loading Greedy",
    badge: "/assets/greedy/center-platter.png",
  },
  "teen-patti": {
    title: "Teen Patti",
    label: "Loading Teen Patti",
    badge: "/assets/teen-patti/game-card.png",
  },
} as const;

const SPARKLES = [
  { top: "12%", left: "10%", size: 5, delay: "0s" },
  { top: "20%", left: "84%", size: 7, delay: "0.35s" },
  { top: "38%", left: "16%", size: 4, delay: "0.7s" },
  { top: "48%", left: "90%", size: 6, delay: "0.15s" },
  { top: "62%", left: "8%", size: 5, delay: "0.9s" },
  { top: "72%", left: "76%", size: 7, delay: "0.45s" },
  { top: "84%", left: "30%", size: 4, delay: "1.05s" },
  { top: "90%", left: "58%", size: 6, delay: "0.25s" },
] as const;

export function GameLoadingScreen({
  game,
  overlay = false,
}: GameLoadingScreenProps) {
  const meta = GAME_META[game];

  return (
    <div
      className={`game-boot game-boot--${game}${overlay ? " game-boot--overlay" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={meta.label}
    >
      {!overlay ? <div className="game-boot__peek" aria-hidden="true" /> : null}
      <div className="game-boot__scrim" aria-hidden="true" />

      <section className="game-boot__panel">
        <div className="game-boot__aurora" aria-hidden="true" />
        <div className="game-boot__spotlights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="game-boot__sparkles" aria-hidden="true">
          {SPARKLES.map((sparkle, index) => (
            <span
              key={index}
              className="game-boot__sparkle"
              style={{
                top: sparkle.top,
                left: sparkle.left,
                width: sparkle.size,
                height: sparkle.size,
                animationDelay: sparkle.delay,
              }}
            />
          ))}
        </div>

        <div className="game-boot__stage">
          <div className="game-boot__badge" aria-hidden="true">
            <span className="game-boot__badge-halo" />
            <span className="game-boot__badge-ring" />
            <span className="game-boot__badge-inner">
              <Image
                src={meta.badge}
                alt=""
                fill
                sizes="(max-width: 480px) 36vw, 128px"
                priority
                draggable={false}
              />
            </span>
          </div>

          <h1 className="game-boot__title">{meta.title}</h1>

          <p className="game-boot__loading" aria-hidden="true">
            Loading
            <i />
            <i />
            <i />
          </p>

          <div className="game-boot__bar" aria-hidden="true">
            <span className="game-boot__bar-fill" />
          </div>
        </div>
      </section>

      <span className="sr-only">{meta.label}. Syncing the live round.</span>
    </div>
  );
}
