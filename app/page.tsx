import { GameCard } from "@/components/game-selection/game-card";

export default function GameSelectionPage() {
  return (
    <main className="mobile-canvas game-select-page safe-top safe-bottom text-white">
      <span className="game-select-page__glow game-select-page__glow--one" aria-hidden="true" />
      <span className="game-select-page__glow game-select-page__glow--two" aria-hidden="true" />

      <section className="game-select">
        <div className="game-select__header">
          <div className="game-select__brand" aria-hidden="true">
            <span>G</span>
          </div>
          <div>
            <p className="game-select__eyebrow">
              <i aria-hidden="true" />
              Realtime arcade
            </p>
            <h1>Choose your game</h1>
          </div>
        </div>
        <p className="game-select__intro">
          Fast live rounds, instant wallet updates, and server-verified results.
        </p>

        <div className="game-select__cards">
          <GameCard
            title="Greedy"
            subtitle="Pick an option, place your coin, and follow the live reveal."
            href="/games/greedy"
            active
            accent="linear-gradient(135deg,#ff5558 0%,#f44d72 52%,#f0982d 100%)"
            priority
            artImages={[
              { src: "/assets/greedy/falcon.png", alt: "" },
              { src: "/assets/greedy/tiger.png", alt: "" },
              { src: "/assets/greedy/crown.png", alt: "" },
              { src: "/assets/greedy/diamond.png", alt: "" },
            ]}
            centerImage={{ src: "/assets/greedy/center-platter.png", alt: "" }}
          />
          <GameCard
            title="Teen Patti"
            subtitle="Back one or more hands. The highest unique three-card hand wins."
            href="/games/teen-patti"
            active
            accent="linear-gradient(135deg,#b7492d 0%,#d7782e 48%,#6f241c 100%)"
            heroImage={{ src: "/assets/teen-patti/game-card.png", alt: "" }}
          />
          <GameCard
            title="More games"
            subtitle="New live game modes are on the way."
            accent="linear-gradient(135deg,#167f74 0%,#32ad94 100%)"
            art={["🎲", "⭐", "🎮", "🏆"]}
          />
        </div>

        <p className="game-select__footnote">
          <span aria-hidden="true">◆</span>
          All outcomes are generated and verified by the game server.
        </p>
      </section>
    </main>
  );
}
