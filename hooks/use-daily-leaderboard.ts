"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGameLeaderboard } from "@/lib/api";
import type {
  GameLeaderboardData,
  LeaderboardGameCode,
  LeaderboardPeriod,
} from "@/types/leaderboard";

type LeaderboardState = {
  data: GameLeaderboardData | null;
  loading: boolean;
  error: string | null;
};

export function useDailyLeaderboard(
  gameCode: LeaderboardGameCode,
  period: LeaderboardPeriod,
  enabled: boolean,
) {
  const [state, setState] = useState<LeaderboardState>({
    data: null,
    loading: false,
    error: null,
  });
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Partial<Record<LeaderboardPeriod, GameLeaderboardData>>>(
    {},
  );

  const load = useCallback(async () => {
    if (!enabled) return;
    const requestId = ++requestIdRef.current;
    const cached = cacheRef.current[period] ?? null;
    setState((prev) => ({
      data: cached ?? prev.data,
      loading: true,
      error: null,
    }));

    try {
      const data = await fetchGameLeaderboard(gameCode, period);
      if (requestId !== requestIdRef.current) return;
      cacheRef.current[period] = data;
      setState({ data, loading: false, error: null });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setState((prev) => ({
        data: cacheRef.current[period] ?? prev.data,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load leaderboard",
      }));
    }
  }, [enabled, gameCode, period]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !state.data?.resetsAt || period !== "today") return;
    const resetsAtMs = new Date(state.data.resetsAt).getTime();
    if (!Number.isFinite(resetsAtMs)) return;
    const delay = Math.max(1_000, resetsAtMs - Date.now() + 250);
    const timer = window.setTimeout(() => {
      cacheRef.current = {};
      void load();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [enabled, load, period, state.data?.resetsAt]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh: load,
  };
}
