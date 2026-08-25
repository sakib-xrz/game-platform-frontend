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
            subtitle="Choose your lucky food and watch the wheel reveal the winner."
            href="/games/greedy"
            playerUserId={playerUserId}
            active
            variant="greedy"
            statusLabel="Arcade wheel"
            meta={["8 choices", "Quick play"]}
            accent="linear-gradient(135deg,#44091a 0%,#73132e 45%,#a61c3c 78%,#d9561c 100%)"
            priority
            heroImage={{ src: "/assets/greedy/game-card.png", alt: "" }}
          />
          <GameCard
            title="Greedy Classic"
            subtitle="Choose a lucky food on the classic board and chase the round multiplier."
            href="/games/greedy-classic"
            playerUserId={playerUserId}
            active
            variant="greedy-classic"
            statusLabel="Classic arcade"
            meta={["8 foods", "Live rounds"]}
            accent="linear-gradient(135deg,#44091a 0%,#73132e 45%,#a61c3c 78%,#d9561c 100%)"
            heroImage={{ src: "/assets/greedy-classic/lobby-hero.png", alt: "" }}
          />
          <GameCard
            title="Teen Patti"
            subtitle="Back one or more royal hands. Highest three-card hand wins."
            href="/games/teen-patti"
            playerUserId={playerUserId}
            active
            variant="teen-patti"
            statusLabel="Royal table"
            meta={["3 hands", "Live reveal"]}
            accent="linear-gradient(135deg,#44091a 0%,#73132e 45%,#a61c3c 78%,#d9561c 100%)"
            heroImage={{ src: "/assets/teen-patti/game-card.png", alt: "" }}
          />
          <GameCard
            title="Lucky 77"
            subtitle="Choose one lucky symbol, stack your coins, and watch the golden wheel decide."
            href="/games/lucky-77"
            playerUserId={playerUserId}
            active
            variant="lucky-77"
            statusLabel="Prize wheel"
            meta={["3 choices", "One pick"]}
            accent="linear-gradient(135deg,#260553 0%,#54118e 48%,#8e2fb2 100%)"
            heroImage={{ src: "/assets/lucky-77/lobby-hero.png", alt: "" }}
          />
        </div>
      </section>
    </main>
  );
}
