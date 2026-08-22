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

const MIN_BOOT_VISIBILITY_MS = 1_400;

function targetPath(game: BootGame) {
  return game === "greedy" ? "/games/greedy" : "/games/teen-patti";
}

export function GameBootProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [bootGame, setBootGame] = useState<BootGame | null>(null);
  const originPathRef = useRef<string | null>(null);
  const reachedTargetRef = useRef(false);
  const bootStartedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const finishBoot = useCallback(() => {
    clearHideTimer();
    setBootGame(null);
    originPathRef.current = null;
    reachedTargetRef.current = false;
    bootStartedAtRef.current = null;
  }, [clearHideTimer]);

  const hideBoot = useCallback(() => {
    const startedAt = bootStartedAtRef.current;
    if (startedAt === null) {
      finishBoot();
      return;
    }

    const remaining = MIN_BOOT_VISIBILITY_MS - (Date.now() - startedAt);
    if (remaining <= 0) {
      finishBoot();
      return;
    }

    clearHideTimer();
    hideTimerRef.current = setTimeout(finishBoot, remaining);
  }, [clearHideTimer, finishBoot]);

  const showBoot = useCallback((game: BootGame) => {
    clearHideTimer();
    originPathRef.current = pathname;
    reachedTargetRef.current = false;
    bootStartedAtRef.current = Date.now();
    setBootGame(game);
  }, [clearHideTimer, pathname]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

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

    // The requested game was never reached, or the user navigated away from it.
    // In that case there is no handoff to protect, so remove the takeover now.
    finishBoot();
  }, [bootGame, finishBoot, pathname]);

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
