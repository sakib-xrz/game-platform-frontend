"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { teenPattiApi, ApiError } from "@/lib/api";
import { createBetRequestId } from "@/lib/request-id";
import { getGameSocket } from "@/lib/socket";
import type {
  BetAcceptedEvent,
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

type PendingBet = {
  amount: bigint;
  requestId: string;
  roundId: string;
};

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
  const winningDeck = current.round.options.find(
    (deck) => deck.id === payload.winning_option.id,
  );
  if (!winningDeck) return current;
  return {
    ...current,
    round: {
      ...current.round,
      status: "result_revealed",
      result: {
        round_id: payload.round_id,
        revealed_at: payload.revealed_at,
        winning_option: { ...winningDeck, ...payload.winning_option },
        hands,
      },
    },
  };
}

export function useTeenPattiGame() {
  const [snapshot, setSnapshot] = useState<TeenPattiSnapshot | null>(null);
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
  const [notice, setNotice] = useState<GameNotice>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const mountedRef = useRef(false);
  const snapshotRef = useRef<TeenPattiSnapshot | null>(null);
  const revealedRoundIdRef = useRef<string | null>(null);
  const recoveryInFlightRef = useRef<Promise<void> | null>(null);
  const recoveryQueuedReasonRef = useRef<string | null>(null);
  const pendingBetAmountsRef = useRef(new Map<string, PendingBet>());
  const seenEventIdsRef = useRef(new Set<string>());
  const noticeIdRef = useRef(0);
  const resultCloseTimerRef = useRef<number | null>(null);
  const resultOpenTimerRef = useRef<number | null>(null);
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

  const pushNotice = useCallback((kind: NonNullable<GameNotice>["kind"], message: string) => {
    const id = ++noticeIdRef.current;
    setNotice({ id, kind, message });
    window.setTimeout(() => {
      setNotice((current) => (current?.id === id ? null : current));
    }, 2_600);
  }, []);

  const scheduleResultClose = useCallback((durationMs: number) => {
    if (resultCloseTimerRef.current) window.clearTimeout(resultCloseTimerRef.current);
    const displayMs = Math.max(800, Math.min(durationMs, 8_000));
    resultCloseTimerRef.current = window.setTimeout(() => setResultModalOpen(false), displayMs);
  }, []);

  const openResultModal = useCallback(
    (
      roundId: string,
      options?: {
        animate?: boolean;
        resultDurationMs?: number;
        resultAgeMs?: number;
      },
    ) => {
      if (revealedRoundIdRef.current === roundId) return;
      revealedRoundIdRef.current = roundId;
      if (resultOpenTimerRef.current) window.clearTimeout(resultOpenTimerRef.current);

      const animate = options?.animate !== false;
      const resultDurationMs = options?.resultDurationMs ?? 5_000;
      const resultAgeMs = Math.max(0, options?.resultAgeMs ?? 0);
      const delay = animate
        ? Math.max(0, TEEN_PATTI_REVEAL_MS - resultAgeMs)
        : 0;
      const visibleDurationMs = resultDurationMs - resultAgeMs - delay;

      // A late recovery should not flash an expired result over a live round.
      if (visibleDurationMs < 800) return;

      resultOpenTimerRef.current = window.setTimeout(() => {
        resultOpenTimerRef.current = null;
        if (!mountedRef.current) return;
        const displayMs = visibleDurationMs;
        setResultModalOpen(true);
        scheduleResultClose(displayMs);
      }, delay);
    },
    [scheduleResultClose],
  );

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
          const next = await teenPattiApi.getSnapshot();
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
            const potTotals = new Map(
              (next.round?.option_pot_totals ?? []).map((row) => [row.option_id, row]),
            );
            for (const previousTotal of previousSnapshot?.round?.option_pot_totals ?? []) {
              const nextTotal = potTotals.get(previousTotal.option_id);
              if (!nextTotal || BigInt(previousTotal.total_amount) > BigInt(nextTotal.total_amount)) {
                potTotals.set(previousTotal.option_id, previousTotal);
              }
            }
            if (missingBets.length) {
              reconciled = {
                ...reconciled,
                my_bets: [...next.my_bets, ...missingBets],
              };
            }
            if (reconciled.round) {
              reconciled = {
                ...reconciled,
                round: {
                  ...reconciled.round,
                  ...(previousSnapshot?.round?.result && !reconciled.round.result
                    ? {
                        status: previousSnapshot.round.status,
                        result: previousSnapshot.round.result,
                      }
                    : {}),
                  option_pot_totals: Array.from(potTotals.values()),
                },
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
            const revealAt = reconciled.round.result.revealed_at
              ? new Date(reconciled.round.result.revealed_at).getTime()
              : 0;
            const ageMs = revealAt ? Date.now() + offset - revealAt : 0;
            openResultModal(reconciled.round.id, {
              animate: ageMs < 2_000,
              resultDurationMs: reconciled.round.result_duration_ms,
              resultAgeMs: ageMs,
            });
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
  }, [openResultModal, pushNotice, syncPendingBets]);

  const placeBet = useCallback(async (
    option: PublicDeck,
    amount: string,
    onSubmitted?: () => void,
  ) => {
    if (pendingBetAmountsRef.current.has(option.id)) return false;
    const current = snapshotRef.current;
    const round = current?.round;
    if (!current || !round) {
      pushNotice("error", "No active round is available.");
      return false;
    }
    if (current.game.status !== "active") {
      pushNotice("info", "Teen Patti is not accepting bets right now.");
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

    const roundExposure = current.my_bets.reduce(
      (total, bet) => total + BigInt(bet.amount),
      0n,
    );
    const pendingExposure = Array.from(pendingBetAmountsRef.current.values())
      .reduce((total, pendingBet) => total + pendingBet.amount, 0n);
    if (betAmount < BigInt(round.min_bet) || betAmount > BigInt(round.max_single_bet)) {
      pushNotice(
        "error",
        `Choose a chip between ${formatCoinAmount(round.min_bet)} and ${formatCoinAmount(round.max_single_bet)}.`,
      );
      return false;
    }
    if (roundExposure + pendingExposure + betAmount > BigInt(round.max_round_bet)) {
      const remaining = BigInt(round.max_round_bet) - roundExposure - pendingExposure;
      pushNotice("error", `Round limit reached. You can add ${formatCoinAmount(remaining.toString())}.`);
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
    onSubmitted?.();
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
        response = await teenPattiApi.placeBet(betPayload);
      } catch (firstError) {
        const uncertain = firstError instanceof ApiError
          && (firstError.status === 0 || firstError.status === 408);
        if (!uncertain) throw firstError;

        // The server may have committed even when the response was lost.
        // Replay the exact same idempotency key so confirmation can never
        // create a second wager.
        pushNotice("info", "Connection interrupted. Confirming your bet…");
        response = await teenPattiApi.placeBet(betPayload);
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
          wallet,
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
      const uncertain = error instanceof ApiError
        && (error.status === 0 || error.status === 408);
      if (uncertain) {
        keepPendingUntilRoundChanges = true;
        pushNotice("info", "Still confirming this bet. This hand will stay locked for your safety.");
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
      if (payload.game_code !== "TEEN_PATTI") return;
      onRoundRefresh(payload);
    };

    const onRoundResult = (payload: RoundResultEvent) => {
      handleDurableEvent(payload, () => {
        const resultAgeMs = Math.max(
          0,
          Date.now() + serverOffsetRef.current - new Date(payload.revealed_at).getTime(),
        );
        setSnapshot((current) => {
          const merged = mergeResultIntoSnapshot(current, payload);
          if (merged) snapshotRef.current = merged;
          return merged ?? current;
        });
        openResultModal(payload.round_id, {
          animate: resultAgeMs < TEEN_PATTI_REVEAL_MS,
          resultDurationMs:
            snapshotRef.current?.round?.result_duration_ms
            ?? snapshotRef.current?.active_config?.result_duration_ms,
          resultAgeMs,
        });
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
          const currentPotTotals = current.round.option_pot_totals ?? [];
          const hasOptionTotal = currentPotTotals.some(
            (row) => row.option_id === payload.option_id,
          );
          const optionPotTotals = hasOptionTotal
            ? currentPotTotals.map((row) => (
                row.option_id === payload.option_id
                  ? {
                      ...row,
                      total_amount: (BigInt(row.total_amount) + BigInt(payload.amount)).toString(),
                    }
                  : row
              ))
            : [
                ...currentPotTotals,
                { option_id: payload.option_id, total_amount: payload.amount },
              ];
          const updated = {
            ...current,
            wallet,
            round: { ...current.round, option_pot_totals: optionPotTotals },
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
        if (payload.reason === "teen_patti_win" && payload.payout) {
          pushNotice("success", `Round payout: +${formatCoinAmount(payload.payout)}`);
          void recover("wallet-payout");
        }
        if (payload.reason === "teen_patti_refund" && payload.refund) {
          pushNotice("info", `Round refund: +${formatCoinAmount(payload.refund)}`);
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
      socket.on("teen_patti.round.opened", onRoundRefresh);
      socket.on("teen_patti.round.locked", onRoundRefresh);
      socket.on("teen_patti.round.drawing", onRoundRefresh);
      socket.on("teen_patti.round.result", onRoundResult);
      socket.on("teen_patti.bet.accepted", onBetAccepted);
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
      recoveryQueuedReasonRef.current = null;
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
        socket.off("platform.game.paused", onPlatformGameRefresh);
        socket.off("platform.game.resumed", onPlatformGameRefresh);
        socket.off("platform.game.availability_changed", onPlatformGameRefresh);
        socket.off("teen_patti.round.opened", onRoundRefresh);
        socket.off("teen_patti.round.locked", onRoundRefresh);
        socket.off("teen_patti.round.drawing", onRoundRefresh);
        socket.off("teen_patti.round.result", onRoundResult);
        socket.off("teen_patti.bet.accepted", onBetAccepted);
        socket.off("teen_patti.round.settled", onRoundRefresh);
        socket.off("teen_patti.round.closed", onRoundRefresh);
        socket.off("teen_patti.round.cancelled", onRoundRefresh);
        socket.off("teen_patti.round.refunded", onRoundRefresh);
        socket.off("wallet.balance.updated", onWalletUpdate);
        socket.disconnect();
      }
    };
  }, [openResultModal, pushNotice, recover, syncPendingBets]);

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
    pendingOptionIds,
    pendingOptionAmounts,
    pendingBetTotal,
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
