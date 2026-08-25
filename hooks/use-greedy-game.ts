"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import {
  greedyApi,
  greedyClassicApi,
  lucky77Api,
  ApiError,
  type GreedyGameApi,
} from "@/lib/api";
import { createBetRequestId } from "@/lib/request-id";
import { getGameSocket } from "@/lib/socket";
import { showToast, type ToastKind } from "@/lib/toast";
import type {
  BetAcceptedEvent,
  GreedySnapshot,
  PlayerBet,
  PlayerIdentity,
  PublicBetAggregate,
  PublicBetPlacedEvent,
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
  optionId: string;
  requestId: string;
  roundId: string;
};

export type BetLanding = {
  id: string;
  optionId: string;
  amount?: string;
  acceptedAt?: string;
  bettor?: PlayerIdentity;
  isMine?: boolean;
};

export type GreedyGameDefinition = Readonly<{
  api: GreedyGameApi;
  gameCode: "GREEDY" | "GREEDY_CLASSIC" | "LUCKY_77";
  eventPrefix: "greedy" | "greedy_classic" | "lucky_77";
  displayName: "Greedy" | "Greedy Classic" | "Lucky 77";
  walletReasonPrefix: "greedy" | "greedy_classic" | "lucky_77";
  singleOptionPerRound?: boolean;
}>;

export const GREEDY_GAME_DEFINITION: GreedyGameDefinition = Object.freeze({
  api: greedyApi,
  gameCode: "GREEDY",
  eventPrefix: "greedy",
  displayName: "Greedy",
  walletReasonPrefix: "greedy",
});

export const GREEDY_CLASSIC_GAME_DEFINITION: GreedyGameDefinition = Object.freeze({
  api: greedyClassicApi,
  gameCode: "GREEDY_CLASSIC",
  eventPrefix: "greedy_classic",
  displayName: "Greedy Classic",
  walletReasonPrefix: "greedy_classic",
});

export const LUCKY_77_GAME_DEFINITION: GreedyGameDefinition = Object.freeze({
  api: lucky77Api,
  gameCode: "LUCKY_77",
  eventPrefix: "lucky_77",
  displayName: "Lucky 77",
  walletReasonPrefix: "lucky_77",
  singleOptionPerRound: true,
});

function aggregateRecency(
  candidate: Pick<PublicBetAggregate, "bet_count" | "last_bet_at">,
  current: Pick<PublicBetAggregate, "bet_count" | "last_bet_at">,
): number {
  if (candidate.bet_count !== current.bet_count) {
    return candidate.bet_count - current.bet_count;
  }
  const candidateTime = new Date(candidate.last_bet_at).getTime();
  const currentTime = new Date(current.last_bet_at).getTime();
  if (Number.isFinite(candidateTime) && Number.isFinite(currentTime)) {
    return candidateTime - currentTime;
  }
  return candidate.last_bet_at.localeCompare(current.last_bet_at);
}

function fresherAggregate(
  left: PublicBetAggregate,
  right: PublicBetAggregate,
): PublicBetAggregate {
  const newer = aggregateRecency(left, right) > 0 ? left : right;
  const other = newer === left ? right : left;
  return {
    ...newer,
    display_name: newer.display_name ?? other.display_name,
    avatar_url: newer.avatar_url ?? other.avatar_url,
  };
}

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

export function useGreedyGame(
  definition: GreedyGameDefinition = GREEDY_GAME_DEFINITION,
) {
  const {
    api,
    displayName,
    eventPrefix,
    gameCode,
    singleOptionPerRound = false,
    walletReasonPrefix,
  } = definition;
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
  const [betLandings, setBetLandings] = useState<BetLanding[]>([]);

  const mountedRef = useRef(false);
  const snapshotRef = useRef<GreedySnapshot | null>(null);
  const revealedRoundIdRef = useRef<string | null>(null);
  const recoveryInFlightRef = useRef<Promise<void> | null>(null);
  const recoveryQueuedReasonRef = useRef<string | null>(null);
  const pendingBetAmountsRef = useRef(new Map<string, PendingBet>());
  const seenEventIdsRef = useRef(new Set<string>());
  const resultCloseTimerRef = useRef<number | null>(null);
  const serverOffsetRef = useRef(0);
  const animatedBetIdsRef = useRef(new Set<string>());
  const landingTimersRef = useRef(new Set<number>());

  const syncPendingBets = useCallback(() => {
    const optionIds = new Set<string>();
    const optionAmounts = new Map<string, bigint>();
    for (const pendingBet of pendingBetAmountsRef.current.values()) {
      optionIds.add(pendingBet.optionId);
      optionAmounts.set(
        pendingBet.optionId,
        (optionAmounts.get(pendingBet.optionId) ?? 0n) + pendingBet.amount,
      );
    }
    setPendingOptionIds(optionIds);
    setPendingOptionAmounts(optionAmounts);
    setPendingBetTotal(
      Array.from(pendingBetAmountsRef.current.values())
        .reduce((total, pendingBet) => total + pendingBet.amount, 0n),
    );
  }, []);

  const pushNotice = useCallback((kind: ToastKind, message: string) => {
    showToast(kind, message);
  }, []);

  const queueBetLanding = useCallback((
    betId: string,
    optionId: string,
    details: Omit<BetLanding, "id" | "optionId"> = {},
  ) => {
    if (!betId || animatedBetIdsRef.current.has(betId)) return;
    animatedBetIdsRef.current.add(betId);
    if (animatedBetIdsRef.current.size > 500) {
      const first = animatedBetIdsRef.current.values().next().value as string | undefined;
      if (first) animatedBetIdsRef.current.delete(first);
    }

    const landing: BetLanding = { id: betId, optionId, ...details };
    setBetLandings((current) => [...current, landing].slice(-24));
    const timer = window.setTimeout(() => {
      landingTimersRef.current.delete(timer);
      if (mountedRef.current) {
        setBetLandings((current) => current.filter((item) => item.id !== landing.id));
      }
    }, 1_350);
    landingTimersRef.current.add(timer);
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
          const next = await api.getSnapshot();
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
            if (previousSnapshot?.round && reconciled.round) {
              const mergedBettors = new Map<string, PublicBetAggregate>();
              for (const bettor of reconciled.round.bettors ?? []) {
                mergedBettors.set(`${bettor.option_id}:${bettor.user_id}`, bettor);
              }
              for (const bettor of previousSnapshot.round.bettors ?? []) {
                const key = `${bettor.option_id}:${bettor.user_id}`;
                const recoveredBettor = mergedBettors.get(key);
                mergedBettors.set(
                  key,
                  recoveredBettor ? fresherAggregate(bettor, recoveredBettor) : bettor,
                );
              }
              reconciled = {
                ...reconciled,
                round: {
                  ...reconciled.round,
                  bettors: Array.from(mergedBettors.values()),
                },
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
            for (const [requestId, pendingBet] of pendingBetAmountsRef.current) {
              if (pendingBet.roundId !== nextRoundId) {
                pendingBetAmountsRef.current.delete(requestId);
              }
            }
            syncPendingBets();
            setBetLandings([]);
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
  }, [api, pushNotice, scheduleResultClose, syncPendingBets]);

  const placeBet = useCallback(async (
    option: PublicOption,
    amount: string,
    optionDisplayName = option.name,
  ) => {
    const current = snapshotRef.current;
    const round = current?.round;
    if (!current || !round) {
      pushNotice("error", "No active round is available.");
      return false;
    }
    if (current.game.status !== "active") {
      pushNotice("info", `${displayName} is not accepting bets right now.`);
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
      (total, bet) => bet.round_id === round.id ? total + BigInt(bet.amount) : total,
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
    if (singleOptionPerRound) {
      const backedOptionId =
        current.my_bets.find((bet) => bet.round_id === round.id)?.option.id
        ?? Array.from(pendingBetAmountsRef.current.values()).find(
          (pendingBet) => pendingBet.roundId === round.id,
        )?.optionId;
      if (backedOptionId && backedOptionId !== option.id) {
        pushNotice("info", "You can back only one Lucky 77 option per round.");
        return false;
      }
    }

    const clientRequestId = createBetRequestId();
    pendingBetAmountsRef.current.set(clientRequestId, {
      amount: betAmount,
      optionId: option.id,
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
        response = await api.placeBet(betPayload);
      } catch (firstError) {
        const uncertain = firstError instanceof ApiError
          && (firstError.status === 0 || firstError.status === 408);
        if (!uncertain) throw firstError;

        // Replaying the same request ID confirms an uncertain transport result
        // without ever producing a second wager.
        pushNotice("info", "Connection interrupted. Confirming your bet…");
        response = await api.placeBet(betPayload);
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

      queueBetLanding(response.bet_id, response.option_id, {
        amount: response.amount,
        acceptedAt: response.accepted_at,
        isMine: true,
      });
      pushNotice("success", `${amount} coins placed on ${optionDisplayName}`);
      return true;
    } catch (error) {
      const uncertain = error instanceof ApiError
        && (error.status === 0 || error.status === 408);
      if (uncertain) {
        keepPendingUntilRoundChanges = true;
        pushNotice("info", "Still confirming this bet. Its amount remains reserved for your safety.");
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
      const pendingBet = pendingBetAmountsRef.current.get(clientRequestId);
      if (!keepPendingUntilRoundChanges && pendingBet?.requestId === clientRequestId) {
        pendingBetAmountsRef.current.delete(clientRequestId);
      }
      if (mountedRef.current) {
        syncPendingBets();
      }
    }
  }, [
    api,
    displayName,
    pushNotice,
    queueBetLanding,
    recover,
    serverOffsetMs,
    singleOptionPerRound,
    syncPendingBets,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    const landingTimers = landingTimersRef.current;
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
      if (payload.game_code !== gameCode) return;
      onRoundRefresh(payload);
    };

    const onRoundResult = (payload: RoundResultEvent) => {
      handleDurableEvent(payload, () => {
        const current = snapshotRef.current;
        const winningOption = current?.round?.id === payload.round_id
          ? current.round.options.find(
              (option) => option.id === payload.winning_option.id,
            )
          : null;
        if (!current?.round || !winningOption) {
          void recover("socket-result-missing-snapshot");
          return;
        }

        const updated: GreedySnapshot = {
          ...current,
          round: {
            ...current.round,
            status: "result_revealed",
            result: {
              round_id: payload.round_id,
              winning_option: { ...winningOption, ...payload.winning_option },
              winning_slot_index: payload.winning_slot_index,
              revealed_at: payload.revealed_at,
              top_winners: payload.top_winners ?? [],
            },
          },
        };
        revealedRoundIdRef.current = payload.round_id;
        snapshotRef.current = updated;
        setSnapshot(updated);
        const resultDurationMs =
          updated.round?.result_duration_ms
          ?? updated.active_config.result_duration_ms
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
        const pendingBet = pendingBetAmountsRef.current.get(payload.client_request_id);
        if (
          pendingBet?.roundId === payload.round_id
          && pendingBet.requestId === payload.client_request_id
        ) {
          pendingBetAmountsRef.current.delete(payload.client_request_id);
          syncPendingBets();
        }
      });
    };

    const onPublicBetPlaced = (payload: PublicBetPlacedEvent) => {
      handleDurableEvent(payload, () => {
        const currentRound = snapshotRef.current?.round;
        if (!currentRound || currentRound.id !== payload.round_id) return;

        const eventAggregate: PublicBetAggregate = {
          round_id: payload.round_id,
          option_id: payload.option_id,
          user_id: payload.bettor.user_id,
          display_name: payload.bettor.display_name,
          avatar_url: payload.bettor.avatar_url,
          total_amount: payload.total_amount,
          bet_count: payload.bet_count,
          first_bet_at: payload.first_bet_at,
          last_bet_at: payload.last_bet_at,
        };

        const existing = currentRound.bettors.find(
          (bettor) => bettor.option_id === payload.option_id
            && bettor.user_id === payload.bettor.user_id,
        );

        const acceptedTime = new Date(payload.accepted_at).getTime();
        const eventAgeMs = Date.now() + serverOffsetRef.current - acceptedTime;
        if (Number.isFinite(acceptedTime) && eventAgeMs >= -1_000 && eventAgeMs <= 2_500) {
          queueBetLanding(payload.bet_id, payload.option_id, {
            amount: payload.amount,
            acceptedAt: payload.accepted_at,
            bettor: payload.bettor,
            isMine:
              payload.bettor.user_id === snapshotRef.current?.wallet.user_id,
          });
        }
        if (existing && aggregateRecency(eventAggregate, existing) <= 0) return;
        setSnapshot((current) => {
          if (!current?.round || current.round.id !== payload.round_id) return current;
          const existingIndex = current.round.bettors.findIndex(
            (bettor) => bettor.option_id === payload.option_id
              && bettor.user_id === payload.bettor.user_id,
          );
          const existingBettor = existingIndex >= 0
            ? current.round.bettors[existingIndex]
            : null;
          if (
            existingBettor
            && aggregateRecency(eventAggregate, existingBettor) <= 0
          ) {
            return current;
          }

          const nextBettor = existingBettor
            ? fresherAggregate(eventAggregate, existingBettor)
            : eventAggregate;
          const bettors = existingIndex >= 0
            ? current.round.bettors.map((bettor, index) => (
                index === existingIndex ? nextBettor : bettor
              ))
            : [...current.round.bettors, nextBettor];
          const updated = {
            ...current,
            round: { ...current.round, bettors },
          };
          snapshotRef.current = updated;
          return updated;
        });
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
        if (payload.reason === `${walletReasonPrefix}_win` && payload.payout) {
          pushNotice("success", `Round payout: +${payload.payout} coins`);
          void recover("wallet-payout");
        }
        if (payload.reason === `${walletReasonPrefix}_refund` && payload.refund) {
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
      socket.on(`${eventPrefix}.round.opened`, onRoundRefresh);
      socket.on(`${eventPrefix}.round.locked`, onRoundRefresh);
      socket.on(`${eventPrefix}.round.drawing`, onRoundRefresh);
      socket.on(`${eventPrefix}.round.result`, onRoundResult);
      socket.on(`${eventPrefix}.bet.accepted`, onBetAccepted);
      socket.on(`${eventPrefix}.bet.placed`, onPublicBetPlaced);
      socket.on(`${eventPrefix}.round.settled`, onRoundRefresh);
      socket.on(`${eventPrefix}.round.closed`, onRoundRefresh);
      socket.on(`${eventPrefix}.round.cancelled`, onRoundRefresh);
      socket.on(`${eventPrefix}.round.refunded`, onRoundRefresh);
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
      for (const timer of landingTimers) window.clearTimeout(timer);
      landingTimers.clear();
      if (socket) {
        socket.off("connect");
        socket.off("disconnect", onDisconnect);
        socket.off("platform.connected", onConnected);
        socket.off("platform.game.paused", onPlatformGameRefresh);
        socket.off("platform.game.resumed", onPlatformGameRefresh);
        socket.off("platform.game.availability_changed", onPlatformGameRefresh);
        socket.off(`${eventPrefix}.round.opened`, onRoundRefresh);
        socket.off(`${eventPrefix}.round.locked`, onRoundRefresh);
        socket.off(`${eventPrefix}.round.drawing`, onRoundRefresh);
        socket.off(`${eventPrefix}.round.result`, onRoundResult);
        socket.off(`${eventPrefix}.bet.accepted`, onBetAccepted);
        socket.off(`${eventPrefix}.bet.placed`, onPublicBetPlaced);
        socket.off(`${eventPrefix}.round.settled`, onRoundRefresh);
        socket.off(`${eventPrefix}.round.closed`, onRoundRefresh);
        socket.off(`${eventPrefix}.round.cancelled`, onRoundRefresh);
        socket.off(`${eventPrefix}.round.refunded`, onRoundRefresh);
        socket.off("wallet.balance.updated", onWalletUpdate);
        socket.disconnect();
      }
    };
  // recover intentionally carries the latest authoritative snapshot behavior.
  }, [
    eventPrefix,
    gameCode,
    pushNotice,
    queueBetLanding,
    recover,
    scheduleResultClose,
    syncPendingBets,
    walletReasonPrefix,
  ]);

  const roundBetTotal = useMemo(() => {
    const roundId = snapshot?.round?.id;
    return snapshot?.my_bets.reduce(
      (sum, bet) => bet.round_id === roundId ? sum + BigInt(bet.amount) : sum,
      0n,
    ).toString() ?? "0";
  }, [snapshot?.my_bets, snapshot?.round?.id]);

  const optionBetTotals = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const bet of snapshot?.my_bets ?? []) {
      if (bet.round_id !== snapshot?.round?.id) continue;
      totals.set(bet.option.id, (totals.get(bet.option.id) ?? 0n) + BigInt(bet.amount));
    }
    return totals;
  }, [snapshot?.my_bets, snapshot?.round?.id]);

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
    notice: null as GameNotice,
    resultModalOpen,
    resultModalDisplayMs,
    betLandings,
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    recover,
    placeBet,
  };
}
