"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { greedyApi, ApiError } from "@/lib/api";
import { createBetRequestId } from "@/lib/request-id";
import { getGameSocket } from "@/lib/socket";
import { showToast, type ToastKind } from "@/lib/toast";
import type {
  BetAcceptedEvent,
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

type PendingBet = {
  amount: bigint;
  requestId: string;
  roundId: string;
};

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
  const [pendingOptionIds, setPendingOptionIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [pendingOptionAmounts, setPendingOptionAmounts] = useState<ReadonlyMap<string, bigint>>(
    () => new Map(),
  );
  const [pendingBetTotal, setPendingBetTotal] = useState(0n);
  const [connected, setConnected] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultModalDisplayMs, setResultModalDisplayMs] = useState(3_500);

  const mountedRef = useRef(false);
  const snapshotRef = useRef<GreedySnapshot | null>(null);
  const revealedRoundIdRef = useRef<string | null>(null);
  const recoveryInFlightRef = useRef<Promise<void> | null>(null);
  const recoveryQueuedReasonRef = useRef<string | null>(null);
  const pendingBetAmountsRef = useRef(new Map<string, PendingBet>());
  const seenEventIdsRef = useRef(new Set<string>());
  const resultCloseTimerRef = useRef<number | null>(null);
  const serverOffsetRef = useRef(0);

  const syncPendingBets = useCallback(() => {
    setPendingOptionIds(new Set(pendingBetAmountsRef.current.keys()));
    setPendingOptionAmounts(new Map(
      Array.from(pendingBetAmountsRef.current, ([optionId, pendingBet]) => [
        optionId,
        pendingBet.amount,
      ] as const),
    ));
    setPendingBetTotal(
      Array.from(pendingBetAmountsRef.current.values())
        .reduce((total, pendingBet) => total + pendingBet.amount, 0n),
    );
  }, []);

  const pushNotice = useCallback((kind: ToastKind, message: string) => {
    showToast(kind, message);
  }, []);

  const scheduleResultClose = useCallback((durationMs: number) => {
    if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
    const displayMs = Math.max(800, Math.min(durationMs, 7_000));
    resultCloseTimerRef.current = window.setTimeout(() => setResultModalOpen(false), displayMs);
  }, []);

  const recover = useCallback((reason: string = "manual"): Promise<void> => {
    if (recoveryInFlightRef.current) {
      if (!recoveryQueuedReasonRef.current || reason === "manual") {
        recoveryQueuedReasonRef.current = reason;
      }
      return recoveryInFlightRef.current;
    }

    const runRecovery = async () => {
      let activeReason: string | null = reason;
      if (snapshotRef.current) setRefreshing(true);

      while (activeReason && mountedRef.current) {
        recoveryQueuedReasonRef.current = null;

        try {
          const next = await greedyApi.getSnapshot();
          const finishedAt = Date.now();
          if (!mountedRef.current) return;

          // The API stamps server_time after assembling the snapshot, so the
          // receive time (not the HTTP midpoint) is the matching clock edge.
          const offset = new Date(next.server_time).getTime() - finishedAt;
          serverOffsetRef.current = offset;
          setServerOffsetMs(offset);

          const previousSnapshot = snapshotRef.current;
          const previousRoundId = previousSnapshot?.round?.id ?? null;
          const nextRoundId = next.round?.id ?? null;

          let reconciled = next;
          if (
            previousSnapshot?.wallet.id === next.wallet.id
            && previousSnapshot.wallet.version > next.wallet.version
          ) {
            reconciled = { ...reconciled, wallet: previousSnapshot.wallet };
          }
          if (previousRoundId && previousRoundId === nextRoundId) {
            const nextBetIds = new Set(next.my_bets.map((bet) => bet.id));
            const missingBets = previousSnapshot?.my_bets.filter(
              (bet) => !nextBetIds.has(bet.id),
            ) ?? [];
            if (missingBets.length) {
              reconciled = {
                ...reconciled,
                my_bets: [...next.my_bets, ...missingBets],
              };
            }
            if (previousSnapshot?.round?.result && !reconciled.round?.result) {
              reconciled = {
                ...reconciled,
                round: reconciled.round
                  ? {
                      ...reconciled.round,
                      status: previousSnapshot.round.status,
                      result: previousSnapshot.round.result,
                    }
                  : reconciled.round,
              };
            }
          }

          snapshotRef.current = reconciled;
          setSnapshot(reconciled);
          setFatalError(null);

          if (previousRoundId && nextRoundId !== previousRoundId) {
            for (const [optionId, pendingBet] of pendingBetAmountsRef.current) {
              if (pendingBet.roundId !== nextRoundId) {
                pendingBetAmountsRef.current.delete(optionId);
              }
            }
            syncPendingBets();
            setResultModalOpen(false);
            if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
          }

          if (reconciled.round?.result && reconciled.round.id !== revealedRoundIdRef.current) {
            revealedRoundIdRef.current = reconciled.round.id;
            const revealAt = reconciled.round.result.revealed_at
              ? new Date(reconciled.round.result.revealed_at).getTime()
              : 0;
            const ageMs = revealAt ? Date.now() + offset - revealAt : 0;
            const displayMs = reconciled.round.result_duration_ms - Math.max(0, ageMs);
            if (displayMs >= 800) {
              setResultModalDisplayMs(displayMs);
              setResultModalOpen(true);
              scheduleResultClose(displayMs);
            }
          }
        } catch (error) {
          if (!mountedRef.current) return;
          const message = error instanceof Error ? error.message : "Unable to load the game";
          if (!snapshotRef.current) setFatalError(message);
          if (activeReason === "manual") pushNotice("error", message);
        }

        activeReason = recoveryQueuedReasonRef.current;
      }
    };

    const recoveryTask = runRecovery().finally(() => {
      if (recoveryInFlightRef.current === recoveryTask) {
        recoveryInFlightRef.current = null;
      }
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    });
    recoveryInFlightRef.current = recoveryTask;
    return recoveryTask;
  }, [pushNotice, scheduleResultClose, syncPendingBets]);

  const placeBet = useCallback(async (option: PublicOption, amount: string) => {
    if (pendingBetAmountsRef.current.has(option.id)) return false;
    const current = snapshotRef.current;
    const round = current?.round;
    if (!current || !round) {
      pushNotice("error", "No active round is available.");
      return false;
    }
    if (current.game.status !== "active") {
      pushNotice("info", "Greedy is not accepting bets right now.");
      void recover("game-unavailable");
      return false;
    }
    if (round.status !== "betting_open") {
      pushNotice("info", "Betting is closed for this round.");
      void recover("bet-closed");
      return false;
    }
    if (
      !round.betting_ends_at
      || Date.now() + serverOffsetMs >= new Date(round.betting_ends_at).getTime()
    ) {
      pushNotice("info", "Betting has closed for this round.");
      void recover("bet-deadline");
      return false;
    }

    let betAmount: bigint;
    try {
      betAmount = BigInt(amount);
    } catch {
      pushNotice("error", "This chip value is not valid.");
      return false;
    }

    // One selection per round: block backing a different option once the user
    // has committed (or is committing) to one this round.
    const chosenOptionId = current.my_bets.find((bet) => bet.round_id === round.id)?.option.id
      ?? pendingBetAmountsRef.current.keys().next().value
      ?? null;
    if (chosenOptionId && chosenOptionId !== option.id) {
      pushNotice("info", "You can back only one option per round.");
      return false;
    }

    const roundExposure = current.my_bets.reduce(
      (total, bet) => total + BigInt(bet.amount),
      0n,
    );
    const pendingExposure = Array.from(pendingBetAmountsRef.current.values())
      .reduce((total, pendingBet) => total + pendingBet.amount, 0n);
    if (betAmount < BigInt(round.min_bet) || betAmount > BigInt(round.max_single_bet)) {
      pushNotice("error", `Choose a chip between ${round.min_bet} and ${round.max_single_bet} coins.`);
      return false;
    }
    if (roundExposure + pendingExposure + betAmount > BigInt(round.max_round_bet)) {
      const remaining = BigInt(round.max_round_bet) - roundExposure - pendingExposure;
      pushNotice("error", `Round limit reached. You can add ${remaining.toString()} coins.`);
      return false;
    }
    if (BigInt(current.wallet.balance) - pendingExposure < betAmount) {
      pushNotice("error", "Not enough coins for this chip.");
      return false;
    }

    const clientRequestId = createBetRequestId();
    pendingBetAmountsRef.current.set(option.id, {
      amount: betAmount,
      requestId: clientRequestId,
      roundId: round.id,
    });
    syncPendingBets();
    let keepPendingUntilRoundChanges = false;
    try {
      const betPayload = {
        round_id: round.id,
        option_id: option.id,
        amount,
        client_request_id: clientRequestId,
      };
      let response;
      try {
        response = await greedyApi.placeBet(betPayload);
      } catch (firstError) {
        const uncertain = firstError instanceof ApiError
          && (firstError.status === 0 || firstError.status === 408);
        if (!uncertain) throw firstError;

        // Replaying the same request ID confirms an uncertain transport result
        // without ever producing a second wager.
        pushNotice("info", "Connection interrupted. Confirming your bet…");
        response = await greedyApi.placeBet(betPayload);
      }

      setSnapshot((existing) => {
        if (!existing) return existing;
        const wallet = response.wallet_version >= existing.wallet.version
          ? {
              ...existing.wallet,
              balance: response.wallet_balance,
              version: response.wallet_version,
            }
          : existing.wallet;
        if (existing.round?.id !== response.round_id) {
          const updated = { ...existing, wallet };
          snapshotRef.current = updated;
          return updated;
        }
        if (existing.my_bets.some((bet) => bet.id === response.bet_id)) {
          const updated = {
            ...existing,
            wallet,
          };
          snapshotRef.current = updated;
          return updated;
        }
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
          wallet,
          my_bets: [...existing.my_bets, optimisticBet],
        };
        snapshotRef.current = updated;
        return updated;
      });

      pushNotice("success", `${amount} coins placed on ${option.name}`);
      return true;
    } catch (error) {
      const uncertain = error instanceof ApiError
        && (error.status === 0 || error.status === 408);
      if (uncertain) {
        keepPendingUntilRoundChanges = true;
        pushNotice("info", "Still confirming this bet. This choice will stay locked for your safety.");
        await recover("bet-uncertain");
      } else {
        const message = error instanceof Error ? error.message : "Bet could not be placed";
        pushNotice("error", message);
        if (
          error instanceof ApiError
          && (error.status === 400 || error.status === 409 || error.status === 503)
        ) {
          void recover("bet-rejected");
        }
      }
      return false;
    } finally {
      const pendingBet = pendingBetAmountsRef.current.get(option.id);
      if (!keepPendingUntilRoundChanges && pendingBet?.requestId === clientRequestId) {
        pendingBetAmountsRef.current.delete(option.id);
      }
      if (mountedRef.current) {
        syncPendingBets();
      }
    }
  }, [pushNotice, recover, serverOffsetMs, syncPendingBets]);

  useEffect(() => {
    mountedRef.current = true;
    let socket: Socket | null = null;

    const handleDurableEvent = (payload: { event_id?: string }, action: () => void) => {
      if (eventAlreadySeen(payload?.event_id, seenEventIdsRef.current)) return;
      action();
    };

    const onConnected = (payload: { server_time?: string }) => {
      setConnected(true);
      if (payload?.server_time) {
        const offset = new Date(payload.server_time).getTime() - Date.now();
        serverOffsetRef.current = offset;
        setServerOffsetMs(offset);
      }
    };

    const onDisconnect = () => setConnected(false);

    const onRoundRefresh = (payload: { event_id?: string }) => {
      handleDurableEvent(payload, () => void recover("socket-round"));
    };

    const onPlatformGameRefresh = (payload: { event_id?: string; game_code?: string }) => {
      if (payload.game_code !== "GREEDY") return;
      onRoundRefresh(payload);
    };

    const onRoundResult = (payload: RoundResultEvent) => {
      handleDurableEvent(payload, () => {
        revealedRoundIdRef.current = payload.round_id;
        setSnapshot((current) => {
          if (!current?.round || current.round.id !== payload.round_id) return current;
          const winningOption = current.round.options.find(
            (option) => option.id === payload.winning_option.id,
          );
          if (!winningOption) return current;
          const updated = {
            ...current,
            round: {
              ...current.round,
              status: "result_revealed",
              result: {
                round_id: payload.round_id,
                winning_option: { ...winningOption, ...payload.winning_option },
                revealed_at: payload.revealed_at,
              },
            },
          };
          snapshotRef.current = updated;
          return updated;
        });
        const resultDurationMs =
          snapshotRef.current?.round?.result_duration_ms
          ?? snapshotRef.current?.active_config?.result_duration_ms
          ?? 3_500;
        const resultAgeMs = Math.max(
          0,
          Date.now() + serverOffsetRef.current - new Date(payload.revealed_at).getTime(),
        );
        const displayMs = resultDurationMs - resultAgeMs;
        if (displayMs >= 800) {
          setResultModalDisplayMs(displayMs);
          setResultModalOpen(true);
          scheduleResultClose(displayMs);
        }
        void recover("socket-result");
      });
    };

    const onBetAccepted = (payload: BetAcceptedEvent) => {
      handleDurableEvent(payload, () => {
        setSnapshot((current) => {
          if (!current) return current;
          const wallet = payload.wallet_version >= current.wallet.version
            ? {
                ...current.wallet,
                balance: payload.wallet_balance,
                version: payload.wallet_version,
              }
            : current.wallet;
          if (
            current.round?.id !== payload.round_id
            || current.my_bets.some((bet) => bet.id === payload.bet_id)
          ) {
            const updated = { ...current, wallet };
            snapshotRef.current = updated;
            return updated;
          }
          const option = current.round.options.find((item) => item.id === payload.option_id);
          if (!option) {
            const updated = { ...current, wallet };
            snapshotRef.current = updated;
            return updated;
          }
          const optimisticBet: PlayerBet = {
            id: payload.bet_id,
            round_id: payload.round_id,
            amount: payload.amount,
            accepted_at: payload.accepted_at,
            option,
            settlement: null,
          };
          const updated = {
            ...current,
            wallet,
            my_bets: [...current.my_bets, optimisticBet],
          };
          snapshotRef.current = updated;
          return updated;
        });
        const pendingBet = pendingBetAmountsRef.current.get(payload.option_id);
        if (
          pendingBet?.roundId === payload.round_id
          && pendingBet.requestId === payload.client_request_id
        ) {
          pendingBetAmountsRef.current.delete(payload.option_id);
          syncPendingBets();
        }
      });
    };

    const onWalletUpdate = (payload: WalletBalanceEvent) => {
      handleDurableEvent(payload, () => {
        setSnapshot((current) => {
          if (!current || current.wallet.id !== payload.wallet_id) return current;
          if (payload.wallet_version < current.wallet.version) return current;
          const updated = {
            ...current,
            wallet: {
              ...current.wallet,
              balance: payload.balance,
              version: payload.wallet_version,
            },
          };
          snapshotRef.current = updated;
          return updated;
        });
        if (payload.reason === "greedy_win" && payload.payout) {
          pushNotice("success", `Round payout: +${payload.payout} coins`);
          void recover("wallet-payout");
        }
        if (payload.reason === "greedy_refund" && payload.refund) {
          pushNotice("info", `Round refund: +${payload.refund} coins`);
          void recover("wallet-refund");
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
      socket.on("platform.game.paused", onPlatformGameRefresh);
      socket.on("platform.game.resumed", onPlatformGameRefresh);
      socket.on("platform.game.availability_changed", onPlatformGameRefresh);
      socket.on("greedy.round.opened", onRoundRefresh);
      socket.on("greedy.round.locked", onRoundRefresh);
      socket.on("greedy.round.drawing", onRoundRefresh);
      socket.on("greedy.round.result", onRoundResult);
      socket.on("greedy.bet.accepted", onBetAccepted);
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
      recoveryQueuedReasonRef.current = null;
      window.cancelAnimationFrame(initialRecoveryFrame);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.clearInterval(fallbackTimer);
      if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect", onDisconnect);
        socket.off("platform.connected", onConnected);
        socket.off("platform.game.paused", onPlatformGameRefresh);
        socket.off("platform.game.resumed", onPlatformGameRefresh);
        socket.off("platform.game.availability_changed", onPlatformGameRefresh);
        socket.off("greedy.round.opened", onRoundRefresh);
        socket.off("greedy.round.locked", onRoundRefresh);
        socket.off("greedy.round.drawing", onRoundRefresh);
        socket.off("greedy.round.result", onRoundResult);
        socket.off("greedy.bet.accepted", onBetAccepted);
        socket.off("greedy.round.settled", onRoundRefresh);
        socket.off("greedy.round.closed", onRoundRefresh);
        socket.off("greedy.round.cancelled", onRoundRefresh);
        socket.off("greedy.round.refunded", onRoundRefresh);
        socket.off("wallet.balance.updated", onWalletUpdate);
        socket.disconnect();
      }
    };
  // recover intentionally carries the latest authoritative snapshot behavior.
  }, [pushNotice, recover, scheduleResultClose, syncPendingBets]);

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
    pendingOptionIds,
    pendingOptionAmounts,
    pendingBetTotal,
    connected,
    serverOffsetMs,
    fatalError,
    notice,
    resultModalOpen,
    resultModalDisplayMs,
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    recover,
    placeBet,
  };
}
