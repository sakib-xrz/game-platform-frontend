import type { Viewport } from "next";
import { DevPlayerSwitcher } from "@/components/dev-player-switcher";
import { GameCard } from "@/components/game-selection/game-card";

export const viewport: Viewport = {
  themeColor: "#fff6e4",
  colorScheme: "light",
};

export default function GameSelectionPage() {
  return (
    <main className="mobile-canvas game-select-page safe-top safe-bottom">
      <span
        className="game-select-page__glow game-select-page__glow--one"
        aria-hidden="true"
      />
      <span
        className="game-select-page__glow game-select-page__glow--two"
        aria-hidden="true"
      />
      <span className="game-select-page__grain" aria-hidden="true" />

      <section className="game-select">
        <DevPlayerSwitcher variant="panel" />

        <div className="game-select__cards">
          <GameCard
            title="Greedy"
            subtitle="Choose your lucky food and watch the wheel reveal the winner."
            href="/games/greedy"
            active
            variant="greedy"
            statusLabel="Arcade wheel"
            meta={["8 choices", "Quick play"]}
            accent="linear-gradient(135deg,#44091a 0%,#73132e 45%,#a61c3c 78%,#d9561c 100%)"
            priority
            heroImage={{ src: "/assets/greedy/game-card.png", alt: "" }}
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
      </section>
    </main>
  );
}
