import { GameLoadingScreen } from "@/components/game-loading-screen";

export default function TeenPattiRouteLoading() {
  return (
    <>
      <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
      <GameLoadingScreen game="teen-patti" overlay />
    </>
  );
}
