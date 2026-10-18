import type { Viewport } from "next";
import { GameCard } from "@/components/game-selection/game-card";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function DemoLobbyPage() {
  return (
    <main className="mobile-canvas game-select-page safe-top safe-bottom">
      <section className="game-select">
        <header className="demo-lobby__banner">
          <span className="demo-lobby__badge">DEMO</span>
          <div>
            <strong>Practice table</strong>
            <small>Play all four games. Nothing is saved to the live database.</small>
          </div>
        </header>
        <div className="game-select__cards">
          <GameCard
            title="Greedy"
            href="/demo/greedy"
            plain
            variant="greedy"
            image={{ src: "/assets/game-lobby/greedy.webp" }}
            preload
          />
          <GameCard
            title="Greedy Classic"
            href="/demo/greedy-classic"
            plain
            variant="greedy-classic"
            image={{ src: "/assets/game-lobby/greedy-classic.webp" }}
            preload
          />
          <GameCard
            title="Teen Patti"
            href="/demo/teen-patti"
            plain
            variant="teen-patti"
            image={{ src: "/assets/game-lobby/teen-patti.webp" }}
            preload
          />
          <GameCard
            title="Lucky 77"
            href="/demo/lucky-77"
            plain
            variant="lucky-77"
            image={{ src: "/assets/game-lobby/lucky-77.webp" }}
            preload
          />
        </div>
      </section>
    </main>
  );
}
