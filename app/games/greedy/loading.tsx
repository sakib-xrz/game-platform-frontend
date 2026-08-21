import { GameLoadingScreen } from "@/components/game-loading-screen";

export default function GreedyRouteLoading() {
  return (
    <>
      <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
      <GameLoadingScreen game="greedy" overlay />
    </>
  );
}
