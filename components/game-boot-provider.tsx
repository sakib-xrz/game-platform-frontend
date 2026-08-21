"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { GameLoadingScreen } from "@/components/game-loading-screen";

export type BootGame = "greedy" | "teen-patti";

type GameBootContextValue = {
  bootGame: BootGame | null;
  showBoot: (game: BootGame) => void;
  hideBoot: () => void;
};

const GameBootContext = createContext<GameBootContextValue | null>(null);

function targetPath(game: BootGame) {
  return game === "greedy" ? "/games/greedy" : "/games/teen-patti";
}

export function GameBootProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [bootGame, setBootGame] = useState<BootGame | null>(null);
  const originPathRef = useRef<string | null>(null);
  const reachedTargetRef = useRef(false);

  const hideBoot = useCallback(() => {
    setBootGame(null);
    originPathRef.current = null;
    reachedTargetRef.current = false;
  }, []);

  const showBoot = useCallback((game: BootGame) => {
    originPathRef.current = pathname;
    reachedTargetRef.current = false;
    setBootGame(game);
  }, [pathname]);

  useEffect(() => {
    if (!bootGame) return;

    const target = targetPath(bootGame);
    if (pathname.startsWith(target)) {
      reachedTargetRef.current = true;
      return;
    }

    // Still on the page where the open started (usually "/").
    if (!reachedTargetRef.current && pathname === originPathRef.current) {
      return;
    }

    hideBoot();
  }, [bootGame, hideBoot, pathname]);

  const value = useMemo(
    () => ({ bootGame, showBoot, hideBoot }),
    [bootGame, showBoot, hideBoot],
  );

  return (
    <GameBootContext.Provider value={value}>
      {children}
      {bootGame ? <GameLoadingScreen game={bootGame} overlay /> : null}
    </GameBootContext.Provider>
  );
}

export function useGameBoot() {
  const context = useContext(GameBootContext);
  if (!context) {
    throw new Error("useGameBoot must be used within GameBootProvider");
  }
  return context;
}
