import { GameCard } from "@/components/game-selection/game-card";

export default function GameSelectionPage() {
  return (
    <main className="mobile-canvas safe-top safe-bottom bg-[linear-gradient(180deg,#191b26_0%,#232637_48%,#161822_100%)] px-4 text-white">
      <section className="mx-auto flex min-h-[100dvh] flex-col justify-center py-8">
        <div className="mb-7 px-1">
          <p className="text-xs font-extrabold uppercase tracking-[.22em] text-amber-300">Realtime arcade</p>
          <h1 className="mt-2 text-[36px] font-black leading-[.98] tracking-[-.05em]">Choose your game</h1>
          <p className="mt-3 max-w-sm text-sm font-medium leading-6 text-white/60">
            Fast mobile rounds, live wallet updates, and server-authoritative results.
          </p>
        </div>

        <div className="space-y-4">
          <GameCard
            title="Greedy"
            subtitle="Pick an option, place your coin, and follow the live reveal."
            href="/games/greedy"
            active
            accent="linear-gradient(135deg,#ff5558 0%,#f44d72 52%,#f0982d 100%)"
            art={["🦅", "🐯", "👑", "💎"]}
          />
          <div className="grid grid-cols-1 gap-4">
            <GameCard
              title="Teen Patti"
              subtitle="Bet on one to three hands. Highest unique Teen Patti wins the pot."
              href="/games/teen-patti"
              active
              accent="linear-gradient(135deg,#4b63d8 0%,#774ae8 100%)"
              art={["♠️", "♥️", "♣️", "♦️"]}
            />
            <GameCard
              title="More games"
              subtitle="New game modes will appear here."
              accent="linear-gradient(135deg,#1f9a86 0%,#36b8a4 100%)"
              art={["🎲", "⭐", "🎮", "🏆"]}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
