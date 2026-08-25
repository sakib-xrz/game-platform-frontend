"use client";

import {
  LUCKY_77_GAME_DEFINITION,
  useGreedyGame,
} from "@/hooks/use-greedy-game";

/** Lucky 77 shares the hardened realtime/wallet recovery pipeline. */
export function useLucky77Game() {
  return useGreedyGame(LUCKY_77_GAME_DEFINITION);
}
