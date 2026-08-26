import type { Viewport } from "next";
import { DevPlayerSwitcher } from "@/components/dev-player-switcher";
import { GameCard } from "@/components/game-selection/game-card";
import { userIdFromSearchParam } from "@/lib/player-identity";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function GameSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string | string[] }>;
}) {
  const params = await searchParams;
  const playerUserId = userIdFromSearchParam(params.user);

  return (
    <main className="mobile-canvas game-select-page safe-top safe-bottom">
      <section className="game-select">
        <DevPlayerSwitcher variant="panel" />

        <div className="game-select__cards">
          <GameCard
            title="Greedy"
            href="/games/greedy"
            playerUserId={playerUserId}
            variant="greedy"
            image={{ src: "/assets/game-lobby/greedy.webp", alt: "Greedy" }}
            priority
          />
          <GameCard
            title="Greedy Classic"
            href="/games/greedy-classic"
            playerUserId={playerUserId}
            variant="greedy-classic"
            image={{
              src: "/assets/game-lobby/greedy-classic.webp",
              alt: "Greedy Classic",
            }}
          />
          <GameCard
            title="Teen Patti"
            href="/games/teen-patti"
            playerUserId={playerUserId}
            variant="teen-patti"
            image={{ src: "/assets/game-lobby/teen-patti.webp", alt: "Teen Patti" }}
          />
          <GameCard
            title="Lucky 77"
            href="/games/lucky-77"
            playerUserId={playerUserId}
            variant="lucky-77"
            image={{ src: "/assets/game-lobby/lucky-77.webp", alt: "Lucky 77" }}
          />
        </div>
      </section>
    </main>
  );
}
