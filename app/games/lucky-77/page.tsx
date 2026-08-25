import type { Viewport } from "next";
import { Lucky77GameScreen } from "@/components/lucky-77/lucky-77-game-screen";

export const viewport: Viewport = {
  themeColor: "#3d087d",
  colorScheme: "dark",
};

export default function Lucky77GamePage() {
  return <Lucky77GameScreen />;
}
