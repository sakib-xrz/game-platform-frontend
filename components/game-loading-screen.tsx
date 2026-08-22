import Image from "next/image";
import type { CSSProperties } from "react";

type GameLoadingScreenProps = {
  game: "greedy" | "teen-patti";
  /** Raises the full-screen takeover above route-level loading UI. */
  overlay?: boolean;
};

const GAME_META = {
  greedy: {
    title: "Greedy",
    label: "Greedy is loading",
  },
  "teen-patti": {
    title: "Teen Patti",
    label: "Teen Patti is loading",
  },
} as const;

const GREEDY_FOODS = [
  {
    src: "/assets/greedy/hot-dog.png",
    x: "50%",
    y: "2%",
    rotate: "-8deg",
    delay: "-0.2s",
  },
  {
    src: "/assets/greedy/kebab.png",
    x: "78%",
    y: "13%",
    rotate: "16deg",
    delay: "-0.7s",
  },
  {
    src: "/assets/greedy/ham.png",
    x: "91%",
    y: "45%",
    rotate: "10deg",
    delay: "-1.1s",
  },
  {
    src: "/assets/greedy/steak.png",
    x: "79%",
    y: "77%",
    rotate: "-9deg",
    delay: "-0.4s",
  },
  {
    src: "/assets/greedy/carrot.png",
    x: "50%",
    y: "90%",
    rotate: "-12deg",
    delay: "-1.3s",
  },
  {
    src: "/assets/greedy/corn.png",
    x: "20%",
    y: "77%",
    rotate: "-20deg",
    delay: "-0.9s",
  },
  {
    src: "/assets/greedy/cabbage.png",
    x: "8%",
    y: "45%",
    rotate: "8deg",
    delay: "-0.1s",
  },
  {
    src: "/assets/greedy/tomato.png",
    x: "21%",
    y: "13%",
    rotate: "-8deg",
    delay: "-1.5s",
  },
] as const;

const THRONES = [
  {
    src: "/assets/teen-patti/throne-green.png",
    className: "game-boot__throne--green",
  },
  {
    src: "/assets/teen-patti/throne-blue.png",
    className: "game-boot__throne--blue",
  },
  {
    src: "/assets/teen-patti/throne-pink.png",
    className: "game-boot__throne--pink",
  },
] as const;

const SPARKLES = [
  { top: "9%", left: "13%", size: 5, delay: "-0.4s" },
  { top: "15%", left: "82%", size: 8, delay: "-1.1s" },
  { top: "31%", left: "6%", size: 4, delay: "-1.8s" },
  { top: "41%", left: "91%", size: 6, delay: "-0.8s" },
  { top: "62%", left: "11%", size: 7, delay: "-1.5s" },
  { top: "71%", left: "87%", size: 4, delay: "-0.2s" },
  { top: "88%", left: "24%", size: 5, delay: "-1s" },
  { top: "91%", left: "72%", size: 7, delay: "-1.9s" },
] as const;

function GreedyLoadingArt() {
  return (
    <div
      className="game-boot__scene game-boot__scene--greedy"
      aria-hidden="true"
    >
      <span className="game-boot__wheel-shadow" />
      <span className="game-boot__wheel-rim" />
      <span className="game-boot__wheel-spokes" />

      {GREEDY_FOODS.map((food) => (
        <span
          key={food.src}
          className="game-boot__food"
          style={
            {
              "--food-x": food.x,
              "--food-y": food.y,
              "--food-rotate": food.rotate,
              "--food-delay": food.delay,
            } as CSSProperties
          }
        >
          <Image src={food.src} alt="" fill sizes="72px" draggable={false} />
        </span>
      ))}

      <span className="game-boot__platter-halo" />
      <span className="game-boot__platter">
        <Image
          src="/assets/greedy/center-feast.png"
          alt=""
          fill
          sizes="(max-width: 480px) 38vw, 172px"
          priority
          draggable={false}
        />
      </span>
    </div>
  );
}

function TeenPattiLoadingArt() {
  return (
    <div
      className="game-boot__scene game-boot__scene--teen-patti"
      aria-hidden="true"
    >
      <span className="game-boot__royal-glow" />
      <span className="game-boot__royal-frame">
        <Image
          src="/assets/teen-patti/game-card.png"
          alt=""
          fill
          sizes="(max-width: 480px) 82vw, 390px"
          priority
          draggable={false}
        />
      </span>

      <span className="game-boot__thrones">
        {THRONES.map((throne) => (
          <span
            key={throne.src}
            className={`game-boot__throne ${throne.className}`}
          >
            <Image
              src={throne.src}
              alt=""
              fill
              sizes="94px"
              draggable={false}
            />
          </span>
        ))}
      </span>

      <span className="game-boot__card-fan">
        <i className="game-boot__playing-card game-boot__playing-card--left">
          A<b>♥</b>
        </i>
        <i className="game-boot__playing-card game-boot__playing-card--middle">
          K<b>♠</b>
        </i>
        <i className="game-boot__playing-card game-boot__playing-card--right">
          Q<b>♦</b>
        </i>
      </span>
    </div>
  );
}

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
      aria-atomic="true"
      aria-busy="true"
      aria-label={meta.label}
    >
      <div className="game-boot__panel">
        <div className="game-boot__ambient" aria-hidden="true">
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
          {game === "greedy" ? <GreedyLoadingArt /> : <TeenPattiLoadingArt />}

          <h1 className="game-boot__title">{meta.title}</h1>
          <p className="game-boot__loading">Loading...</p>

          <div className="game-boot__bar" aria-hidden="true">
            <span className="game-boot__bar-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
