import type { Viewport } from "next";
import { GameCard } from "@/components/game-selection/game-card";

export const viewport: Viewport = {
  themeColor: "#151722",
  colorScheme: "dark",
};

export default function GameSelectionPage() {
  return (
    <main className="mobile-canvas game-select-page safe-top safe-bottom text-white">
      <span className="game-select-page__glow game-select-page__glow--one" aria-hidden="true" />
      <span className="game-select-page__glow game-select-page__glow--two" aria-hidden="true" />
      <span className="game-select-page__grain" aria-hidden="true" />

      <section className="game-select">
        <header className="game-select__topbar">
          <div className="game-select__identity">
            <div className="game-select__brand" aria-hidden="true">
              <span>G</span>
            </div>
            <div>
              <strong>Greedy Games</strong>
              <small>Live arcade</small>
            </div>
          </div>
          <div className="game-select__live" aria-label="2 games available">
            <i aria-hidden="true" />
            <span><strong>2</strong> games</span>
          </div>
        </header>

        <div className="game-select__hero-copy">
          <p className="game-select__eyebrow">
            <i aria-hidden="true" />
            Choose your table
          </p>
          <h1>Ready when<br />you are.</h1>
        </div>
        <p className="game-select__intro">
          Pick a live game and jump straight into the next round.
        </p>

        <div className="game-select__section-heading">
          <strong>Game tables</strong>
          <span>Instant play</span>
        </div>

        <div className="game-select__cards">
          <GameCard
            title="Greedy"
            subtitle="Choose your lucky icon and watch the wheel reveal the winner."
            href="/games/greedy"
            active
            variant="greedy"
            statusLabel="Arcade wheel"
            meta={["8 choices", "Quick play"]}
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
            subtitle="Back one or more royal hands. Highest three-card hand wins."
            href="/games/teen-patti"
            active
            variant="teen-patti"
            statusLabel="Royal table"
            meta={["3 hands", "Live reveal"]}
            accent="linear-gradient(135deg,#b7492d 0%,#d7782e 48%,#6f241c 100%)"
            heroImage={{ src: "/assets/teen-patti/game-card.png", alt: "" }}
          />
          <GameCard
            title="More games"
            subtitle="Fresh challenges and live tables are being prepared."
            variant="soon"
            statusLabel="In the works"
            accent="linear-gradient(135deg,#167f74 0%,#32ad94 100%)"
            art={["🎲", "⭐", "🎮", "🏆"]}
          />
        </div>

        <p className="game-select__footnote">
          <span aria-hidden="true">✓</span>
          Fair rounds · Secure wallet · Server-verified results
        </p>
      </section>
    </main>
  );
}
