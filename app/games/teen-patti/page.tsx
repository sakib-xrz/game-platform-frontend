import type { Viewport } from "next";
import { TeenPattiGameScreen } from "@/components/teen-patti/teen-patti-game-screen";

export const viewport: Viewport = {
  themeColor: "#081b17",
  colorScheme: "dark",
};

export default function TeenPattiGamePage() {
  return <TeenPattiGameScreen />;
}
