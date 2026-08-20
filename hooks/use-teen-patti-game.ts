"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { teenPattiApi, ApiError } from "@/lib/api";
import { createBetRequestId } from "@/lib/request-id";
import { getGameSocket } from "@/lib/socket";
import type {
  DealtHand,
  PlayerBet,
  PublicDeck,
  RoundResultEvent,
  TeenPattiSnapshot,
  WalletBalanceEvent,
} from "@/types/teen-patti";

export type GameNotice = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
} | null;

/** Wait for staggered card flips before opening the result sheet. */
export const TEEN_PATTI_REVEAL_MS = 1_800;

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

function mergeResultIntoSnapshot(
  current: TeenPattiSnapshot | null,
  payload: RoundResultEvent,
): TeenPattiSnapshot | null {
  if (!current?.round || current.round.id !== payload.round_id) return current;
  if (current.round.result) return current;
  const hands = (payload.hands ?? []) as DealtHand[];
  return {
    ...current,
    round: {
      ...current.round,
      status: "result_revealed",
      result: {
        round_id: payload.round_id,
        revealed_at: payload.revealed_at,
        winning_option: payload.winning_option,
        hands,
      },
    },
  };
}

export function useTeenPattiGame() {
  const [snapshot, setSnapshot] = useState<TeenPattiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placingBet, setPlacingBet] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<GameNotice>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const mountedRef = useRef(false);
  const snapshotRef = useRef<TeenPattiSnapshot | null>(null);
  const revealedRoundIdRef = useRef<string | null>(null);
  const recoveryIdRef = useRef(0);
  const seenEventIdsRef = useRef(new Set<string>());
  const noticeIdRef = useRef(0);
  const resultCloseTimerRef = useRef<number | null>(null);
  const resultOpenTimerRef = useRef<number | null>(null);

  const pushNotice = useCallback((kind: NonNullable<GameNotice>["kind"], message: string) => {
    const id = ++noticeIdRef.current;
    setNotice({ id, kind, message });
    window.setTimeout(() => {
      setNotice((current) => (current?.id === id ? null : current));
    }, 2_600);
  }, []);

  const scheduleResultClose = useCallback((durationMs?: number) => {
    if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
    const displayMs = Math.max(3_500, Math.min(durationMs ?? 5_000, 8_000));
    resultCloseTimerRef.current = window.setTimeout(() => setResultModalOpen(false), displayMs);
  }, []);

  const openResultModal = useCallback(
    (roundId: string, options?: { animate?: boolean; resultDurationMs?: number }) => {
      if (revealedRoundIdRef.current === roundId) return;
      revealedRoundIdRef.current = roundId;
      if (resultOpenTimerRef.current) window.clearTimeout(resultOpenTimerRef.current);

      const animate = options?.animate !== false;
      const delay = animate ? TEEN_PATTI_REVEAL_MS : 0;
      resultOpenTimerRef.current = window.setTimeout(() => {
        resultOpenTimerRef.current = null;
        if (!mountedRef.current) return;
        setResultModalOpen(true);
        scheduleResultClose(options?.resultDurationMs);
      }, delay);
    },
    [scheduleResultClose],
  );

  const recover = useCallback(async (reason: string = "manual") => {
    const recoveryId = ++recoveryIdRef.current;
    if (snapshotRef.current) setRefreshing(true);
    const startedAt = Date.now();

    try {
      const next = await teenPattiApi.getSnapshot();
      const finishedAt = Date.now();
      if (!mountedRef.current || recoveryId !== recoveryIdRef.current) return;

      const midpoint = Math.round((startedAt + finishedAt) / 2);
      const offset = new Date(next.server_time).getTime() - midpoint;
      setServerOffsetMs(offset);

      const previousRoundId = snapshotRef.current?.round?.id ?? null;
      const nextRoundId = next.round?.id ?? null;

      snapshotRef.current = next;
      setSnapshot(next);
      setFatalError(null);

      if (previousRoundId && nextRoundId !== previousRoundId) {
        setResultModalOpen(false);
        if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
      }

      if (next.round?.result && next.round.id !== revealedRoundIdRef.current) {
        const revealAt = next.round.result.revealed_at
          ? new Date(next.round.result.revealed_at).getTime()
          : 0;
        const ageMs = revealAt ? Date.now() + offset - revealAt : 0;
        openResultModal(next.round.id, {
          animate: ageMs < 2_000,
          resultDurationMs: next.active_config?.result_duration_ms,
        });
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
  }, [openResultModal, pushNotice]);

  const placeBet = useCallback(async (option: PublicDeck, amount: string) => {
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
    if (BigInt(current.wallet.balance) < BigInt(amount)) {
      pushNotice("error", "Not enough coins for this chip.");
      return false;
    }

    setPlacingBet(true);
    try {
      const response = await teenPattiApi.placeBet({
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
        const currentPotTotals = existing.round.option_pot_totals ?? [];
        const hasOptionTotal = currentPotTotals.some((row) => row.option_id === response.option_id);
        const optimisticPotTotals = hasOptionTotal
          ? currentPotTotals.map((row) => (
              row.option_id === response.option_id
                ? {
                    ...row,
                    total_amount: (BigInt(row.total_amount) + BigInt(response.amount)).toString(),
                  }
                : row
            ))
          : [
              ...currentPotTotals,
              { option_id: response.option_id, total_amount: response.amount },
            ];
        const updated = {
          ...existing,
          wallet: { ...existing.wallet, balance: response.wallet_balance },
          round: {
            ...existing.round,
            option_pot_totals: optimisticPotTotals,
          },
          my_bets: [...existing.my_bets, optimisticBet],
        };
        snapshotRef.current = updated;
        return updated;
      });

      pushNotice("success", `${formatCoinAmount(amount)} on ${option.name}`);
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
        setSnapshot((current) => {
          const merged = mergeResultIntoSnapshot(current, payload);
          if (merged) snapshotRef.current = merged;
          return merged ?? current;
        });
        openResultModal(payload.round_id, {
          animate: true,
          resultDurationMs: snapshotRef.current?.active_config?.result_duration_ms,
        });
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
        if (payload.reason === "teen_patti_win" && payload.payout) {
          pushNotice("success", `Round payout: +${formatCoinAmount(payload.payout)}`);
        }
        if (payload.reason === "teen_patti_refund" && payload.refund) {
          pushNotice("info", `Round refund: +${formatCoinAmount(payload.refund)}`);
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
      socket.on("teen_patti.round.opened", onRoundRefresh);
      socket.on("teen_patti.round.locked", onRoundRefresh);
      socket.on("teen_patti.round.drawing", onRoundRefresh);
      socket.on("teen_patti.round.result", onRoundResult);
      socket.on("teen_patti.round.settled", onRoundRefresh);
      socket.on("teen_patti.round.closed", onRoundRefresh);
      socket.on("teen_patti.round.cancelled", onRoundRefresh);
      socket.on("teen_patti.round.refunded", onRoundRefresh);
      socket.on("wallet.balance.updated", onWalletUpdate);
      socket.connect();
    } catch {
      // Socket callbacks own later transitions.
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
      if (resultOpenTimerRef.current) window.clearTimeout(resultOpenTimerRef.current);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect", onDisconnect);
        socket.off("platform.connected", onConnected);
        socket.off("platform.game.paused", onRoundRefresh);
        socket.off("platform.game.resumed", onRoundRefresh);
        socket.off("teen_patti.round.opened", onRoundRefresh);
        socket.off("teen_patti.round.locked", onRoundRefresh);
        socket.off("teen_patti.round.drawing", onRoundRefresh);
        socket.off("teen_patti.round.result", onRoundResult);
        socket.off("teen_patti.round.settled", onRoundRefresh);
        socket.off("teen_patti.round.closed", onRoundRefresh);
        socket.off("teen_patti.round.cancelled", onRoundRefresh);
        socket.off("teen_patti.round.refunded", onRoundRefresh);
        socket.off("wallet.balance.updated", onWalletUpdate);
        socket.disconnect();
      }
    };
  }, [openResultModal, pushNotice, recover]);

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

  const optionPotTotals = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const row of snapshot?.round?.option_pot_totals ?? []) {
      totals.set(row.option_id, BigInt(row.total_amount));
    }
    return totals;
  }, [snapshot?.round?.option_pot_totals]);

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
    optionPotTotals,
    recover,
    placeBet,
  };
}

function formatCoinAmount(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${value} coins`;
  return `${parsed.toLocaleString()} coins`;
}
