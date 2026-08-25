"use client";

import {
  GREEDY_CLASSIC_GAME_DEFINITION,
  useGreedyGame,
} from "@/hooks/use-greedy-game";

/** Greedy Classic entry point with the same state and actions as Greedy. */
export function useGreedyClassicGame() {
  return useGreedyGame(GREEDY_CLASSIC_GAME_DEFINITION);
}
