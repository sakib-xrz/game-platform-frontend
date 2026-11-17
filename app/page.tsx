import type { Viewport } from "next";
import Link from "next/link";
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
        <div className="game-select__cards">
          <GameCard
            title="Greedy"
            href="/games/greedy"
            playerUserId={playerUserId}
            variant="greedy"
            image={{ src: "/assets/game-lobby/greedy.webp" }}
            preload
          />
          <GameCard
            title="Monkey Wheel"
            href="/games/greedy-classic"
            playerUserId={playerUserId}
            variant="greedy-classic"
            image={{ src: "/assets/game-lobby/monkey-wheel-v4.webp" }}
            preload
          />
          <GameCard
            title="Teen Patti"
            href="/games/teen-patti"
            playerUserId={playerUserId}
            variant="teen-patti"
            image={{ src: "/assets/game-lobby/teen-patti.webp" }}
            preload
          />
          <GameCard
            title="Lucky 77"
            href="/games/lucky-77"
            playerUserId={playerUserId}
            variant="lucky-77"
            image={{ src: "/assets/game-lobby/lucky-77.webp" }}
            preload
          />
        </div>

        <div className="pt-6 pb-2 text-center">
          <Link
            href="/admin/integration"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500/90 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-full border border-amber-500/30 transition-all shadow-sm"
          >
            <span>B2B App Integration & API Docs</span> →
          </Link>
        </div>
      </section>
    </main>
  );
}
