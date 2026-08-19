"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { greedyApi, ApiError } from "@/lib/api";
import { createBetRequestId } from "@/lib/request-id";
import { getGameSocket } from "@/lib/socket";
import type {
  GreedySnapshot,
  PlayerBet,
  PublicOption,
  RoundResultEvent,
  WalletBalanceEvent,
} from "@/types/greedy";

export type GameNotice = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
} | null;

function eventAlreadySeen(eventId: unknown, seen: Set<string>): boolean {
  if (typeof eventId !== "string" || !eventId) return false;
  if (seen.has(eventId)) return true;
  seen.add(eventId);
  if (seen.size > 300) {
    const first = seen.values().next().value as string | undefined;
    if (first) seen.delete(first);
  }
  return false;
}

export function useGreedyGame() {
  const [snapshot, setSnapshot] = useState<GreedySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placingBet, setPlacingBet] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<GameNotice>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const mountedRef = useRef(false);
  const snapshotRef = useRef<GreedySnapshot | null>(null);
  const revealedRoundIdRef = useRef<string | null>(null);
  const recoveryIdRef = useRef(0);
  const seenEventIdsRef = useRef(new Set<string>());
  const noticeIdRef = useRef(0);
  const resultCloseTimerRef = useRef<number | null>(null);

  const pushNotice = useCallback((kind: NonNullable<GameNotice>["kind"], message: string) => {
    const id = ++noticeIdRef.current;
    setNotice({ id, kind, message });
    window.setTimeout(() => {
      setNotice((current) => (current?.id === id ? null : current));
    }, 2_600);
  }, []);

  const scheduleResultClose = useCallback((durationMs?: number) => {
    if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
    const displayMs = Math.max(2_500, Math.min(durationMs ?? 3_500, 7_000));
    resultCloseTimerRef.current = window.setTimeout(() => setResultModalOpen(false), displayMs);
  }, []);

  const recover = useCallback(async (reason: string = "manual") => {
    const recoveryId = ++recoveryIdRef.current;
    if (snapshotRef.current) setRefreshing(true);
    const startedAt = Date.now();

    try {
      const next = await greedyApi.getSnapshot();
      const finishedAt = Date.now();
      if (!mountedRef.current || recoveryId !== recoveryIdRef.current) return;

      const midpoint = Math.round((startedAt + finishedAt) / 2);
      setServerOffsetMs(new Date(next.server_time).getTime() - midpoint);
      snapshotRef.current = next;
      setSnapshot(next);
      setFatalError(null);

      if (next.round?.result && next.round.id !== revealedRoundIdRef.current) {
        revealedRoundIdRef.current = next.round.id;
        setResultModalOpen(true);
        scheduleResultClose(next.active_config?.result_duration_ms);
      }
    } catch (error) {
      if (!mountedRef.current || recoveryId !== recoveryIdRef.current) return;
      const message = error instanceof Error ? error.message : "Unable to load the game";
      if (!snapshotRef.current) setFatalError(message);
      if (reason === "manual") pushNotice("error", message);
    } finally {
      if (mountedRef.current && recoveryId === recoveryIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [pushNotice, scheduleResultClose]);

  const placeBet = useCallback(async (option: PublicOption, amount: string) => {
    const current = snapshotRef.current;
    const round = current?.round;
    if (!current || !round) {
      pushNotice("error", "No active round is available.");
      return false;
    }
    if (round.status !== "betting_open") {
      pushNotice("info", "Betting is closed for this round.");
      void recover("bet-closed");
      return false;
    }

    setPlacingBet(true);
    try {
      const response = await greedyApi.placeBet({
        round_id: round.id,
        option_id: option.id,
        amount,
        client_request_id: createBetRequestId(),
      });

      setSnapshot((existing) => {
        if (!existing || existing.round?.id !== response.round_id) return existing;
        const optimisticBet: PlayerBet = {
          id: response.bet_id,
          round_id: response.round_id,
          amount: response.amount,
          accepted_at: response.accepted_at,
          option,
          settlement: null,
        };
        const updated = {
          ...existing,
          wallet: { ...existing.wallet, balance: response.wallet_balance },
          my_bets: [...existing.my_bets, optimisticBet],
        };
        snapshotRef.current = updated;
        return updated;
      });

      pushNotice("success", `${amount} coins placed on ${option.name}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bet could not be placed";
      pushNotice("error", message);
      if (error instanceof ApiError && (error.status === 409 || error.status === 400)) {
        void recover("bet-rejected");
      }
      return false;
    } finally {
      setPlacingBet(false);
    }
  }, [pushNotice, recover]);

  useEffect(() => {
    mountedRef.current = true;
    let socket: Socket | null = null;

    const handleDurableEvent = (payload: { event_id?: string }, action: () => void) => {
      if (eventAlreadySeen(payload?.event_id, seenEventIdsRef.current)) return;
      action();
    };

    const onConnected = (payload: { server_time?: string }) => {
      setConnected(true);
      if (payload?.server_time) setServerOffsetMs(new Date(payload.server_time).getTime() - Date.now());
      void recover("socket-connected");
    };

    const onDisconnect = () => setConnected(false);

    const onRoundRefresh = (payload: { event_id?: string }) => {
      handleDurableEvent(payload, () => void recover("socket-round"));
    };

    const onRoundResult = (payload: RoundResultEvent) => {
      handleDurableEvent(payload, () => {
        revealedRoundIdRef.current = payload.round_id;
        setResultModalOpen(true);
        scheduleResultClose(snapshotRef.current?.active_config?.result_duration_ms);
        void recover("socket-result");
      });
    };

    const onWalletUpdate = (payload: WalletBalanceEvent) => {
      handleDurableEvent(payload, () => {
        setSnapshot((current) => {
          if (!current || current.wallet.id !== payload.wallet_id) return current;
          const updated = { ...current, wallet: { ...current.wallet, balance: payload.balance } };
          snapshotRef.current = updated;
          return updated;
        });
        if (payload.reason === "greedy_win" && payload.payout) {
          pushNotice("success", `Round payout: +${payload.payout} coins`);
        }
        if (payload.reason === "greedy_refund" && payload.refund) {
          pushNotice("info", `Round refund: +${payload.refund} coins`);
        }
      });
    };

    try {
      socket = getGameSocket();
      socket.on("connect", () => {
        setConnected(true);
        void recover("socket-connect");
      });
      socket.on("disconnect", onDisconnect);
      socket.on("platform.connected", onConnected);
      socket.on("platform.game.paused", onRoundRefresh);
      socket.on("platform.game.resumed", onRoundRefresh);
      socket.on("greedy.round.opened", onRoundRefresh);
      socket.on("greedy.round.locked", onRoundRefresh);
      socket.on("greedy.round.drawing", onRoundRefresh);
      socket.on("greedy.round.result", onRoundResult);
      socket.on("greedy.round.settled", onRoundRefresh);
      socket.on("greedy.round.closed", onRoundRefresh);
      socket.on("greedy.round.cancelled", onRoundRefresh);
      socket.on("greedy.round.refunded", onRoundRefresh);
      socket.on("wallet.balance.updated", onWalletUpdate);
      socket.connect();
    } catch {
      // The initial state is already disconnected; socket callbacks own later transitions.
    }

    const initialRecoveryFrame = window.requestAnimationFrame(() => void recover("initial"));

    const onVisibility = () => {
      if (document.visibilityState === "visible") void recover("visibility");
    };
    const onOnline = () => void recover("online");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    const fallbackTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void recover("fallback");
    }, 20_000);

    return () => {
      mountedRef.current = false;
      window.cancelAnimationFrame(initialRecoveryFrame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.clearInterval(fallbackTimer);
      if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect", onDisconnect);
        socket.off("platform.connected", onConnected);
        socket.off("platform.game.paused", onRoundRefresh);
        socket.off("platform.game.resumed", onRoundRefresh);
        socket.off("greedy.round.opened", onRoundRefresh);
        socket.off("greedy.round.locked", onRoundRefresh);
        socket.off("greedy.round.drawing", onRoundRefresh);
        socket.off("greedy.round.result", onRoundResult);
        socket.off("greedy.round.settled", onRoundRefresh);
        socket.off("greedy.round.closed", onRoundRefresh);
        socket.off("greedy.round.cancelled", onRoundRefresh);
        socket.off("greedy.round.refunded", onRoundRefresh);
        socket.off("wallet.balance.updated", onWalletUpdate);
        socket.disconnect();
      }
    };
  // recover intentionally carries the latest authoritative snapshot behavior.
  }, [pushNotice, recover, scheduleResultClose]);

  const roundBetTotal = useMemo(() => {
    return snapshot?.my_bets.reduce((sum, bet) => sum + BigInt(bet.amount), 0n).toString() ?? "0";
  }, [snapshot?.my_bets]);

  const optionBetTotals = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const bet of snapshot?.my_bets ?? []) {
      totals.set(bet.option.id, (totals.get(bet.option.id) ?? 0n) + BigInt(bet.amount));
    }
    return totals;
  }, [snapshot?.my_bets]);

  return {
    snapshot,
    loading,
    refreshing,
    placingBet,
    connected,
    serverOffsetMs,
    fatalError,
    notice,
    resultModalOpen,
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    recover,
    placeBet,
  };
}
