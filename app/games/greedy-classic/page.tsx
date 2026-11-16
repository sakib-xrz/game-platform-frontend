import type { Viewport } from "next";
import { GreedyClassicGameScreen } from "@/components/greedy-classic/greedy-classic-game-screen";

export const viewport: Viewport = {
  themeColor: "#051a11",
  colorScheme: "dark",
};

export default function GreedyClassicGamePage() {
  return <GreedyClassicGameScreen />;
}
