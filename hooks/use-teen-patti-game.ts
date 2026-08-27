"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { teenPattiApi, ApiError } from "@/lib/api";
import { createBetRequestId } from "@/lib/request-id";
import { getGameSocket } from "@/lib/socket";
import { showToast, type ToastKind } from "@/lib/toast";
import type {
  BetAcceptedEvent,
  DealtHand,
  PlayerBet,
  PublicBetAggregate,
  PublicBetPlacedEvent,
  PublicDeck,
  RoundDrawingEvent,
  RoundLockedEvent,
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
  optionId: string;
  requestId: string;
  roundId: string;
};

/** Let the staggered flips, winner glow, and payout sweep finish first. */
export const TEEN_PATTI_REVEAL_MS = 3_000;
const TEEN_PATTI_RESULT_LIVE_AGE_MS = 500;
const TEEN_PATTI_RESULT_MIN_VISIBLE_MS = 1_600;

function isUncertainBetError(error: unknown): error is ApiError {
  return error instanceof ApiError
    && (
      error.status === 0
      || error.status === 408
      || (error.status === 409 && error.message.toLowerCase().includes("already being processed"))
    );
}

function parseCoinAmount(value: string): bigint | null {
  try {
    const parsed = BigInt(value);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
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
        top_winners: payload.top_winners,
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
  const [resultModalOpen, setResultModalOpen] = useState(false);

  const mountedRef = useRef(false);
  const snapshotRef = useRef<TeenPattiSnapshot | null>(null);
  const revealedRoundIdRef = useRef<string | null>(null);
  const recoveryInFlightRef = useRef<Promise<void> | null>(null);
  const recoveryQueuedReasonRef = useRef<string | null>(null);
  const pendingBetAmountsRef = useRef(new Map<string, PendingBet>());
  const seenEventIdsRef = useRef(new Set<string>());
  const resultCloseTimerRef = useRef<number | null>(null);
  const resultOpenTimerRef = useRef<number | null>(null);
  const serverOffsetRef = useRef(0);

  const updateSnapshot = useCallback((
    updater: (current: TeenPattiSnapshot | null) => TeenPattiSnapshot | null,
  ) => {
    const current = snapshotRef.current;
    const updated = updater(current);
    if (updated === current) return updated;
    snapshotRef.current = updated;
    setSnapshot(updated);
    return updated;
  }, []);

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
        resultRevealedAt?: string | null;
      },
    ) => {
      if (revealedRoundIdRef.current === roundId) return;
      revealedRoundIdRef.current = roundId;
      if (resultOpenTimerRef.current !== null) {
        window.clearTimeout(resultOpenTimerRef.current);
        resultOpenTimerRef.current = null;
      }

      const animate = options?.animate !== false;
      const resultDurationMs = options?.resultDurationMs ?? 5_000;
      const resultAgeMs = Math.max(0, options?.resultAgeMs ?? 0);
      const remainingResultMs = resultDurationMs - resultAgeMs;

      // A late recovery should not flash an expired result over a live round.
      if (remainingResultMs < TEEN_PATTI_RESULT_MIN_VISIBLE_MS) return;

      // A genuinely live result gets the full reveal sequence whenever the
      // configured result window permits it. Never shorten the animation by
      // its network age; clamp only to preserve useful modal reading time.
      const delay = animate
        ? Math.min(
            TEEN_PATTI_REVEAL_MS,
            remainingResultMs - TEEN_PATTI_RESULT_MIN_VISIBLE_MS,
          )
        : 0;
      const visibleDurationMs = remainingResultMs - delay;

      resultOpenTimerRef.current = window.setTimeout(() => {
        resultOpenTimerRef.current = null;
        if (!mountedRef.current) return;
        const currentRound = snapshotRef.current?.round;
        const currentResult = currentRound?.result;
        const expectedRevealedAt = options?.resultRevealedAt;
        if (
          currentRound?.id !== roundId
          || currentResult?.round_id !== roundId
          || (expectedRevealedAt !== undefined
            && currentResult.revealed_at !== expectedRevealedAt)
        ) {
          if (revealedRoundIdRef.current === roundId) {
            revealedRoundIdRef.current = null;
          }
          return;
        }
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
          if (
            next.round
            && (
              !Number.isSafeInteger(next.round.round_bet_count)
              || next.round.round_bet_count < 0
            )
          ) {
            throw new Error("Teen Patti snapshot has an invalid bet watermark");
          }

          // The API stamps server_time after assembling the snapshot, so the
          // receive time (not the HTTP midpoint) is the matching clock edge.
          const offset = new Date(next.server_time).getTime() - finishedAt;
          serverOffsetRef.current = offset;
          setServerOffsetMs(offset);

          const previousSnapshot = snapshotRef.current;
          const previousRoundId = previousSnapshot?.round?.id ?? null;
          const nextRoundId = next.round?.id ?? null;

          const nextPlayer = next.player ?? {
            user_id: next.wallet.user_id,
            display_name: null,
            avatar_url: null,
          };
          let reconciled: TeenPattiSnapshot = { ...next, player: nextPlayer };
          if (
            previousSnapshot?.wallet.id === next.wallet.id
            && previousSnapshot.wallet.version > next.wallet.version
          ) {
            reconciled = { ...reconciled, wallet: previousSnapshot.wallet };
          }
          if (
            previousSnapshot?.player?.user_id === nextPlayer.user_id
            && (previousSnapshot.player.display_name || previousSnapshot.player.avatar_url)
          ) {
            reconciled = {
              ...reconciled,
              player: {
                ...nextPlayer,
                display_name: nextPlayer.display_name ?? previousSnapshot.player.display_name,
                avatar_url: nextPlayer.avatar_url ?? previousSnapshot.player.avatar_url,
              },
            };
          }
          if (previousRoundId && previousRoundId === nextRoundId) {
            const nextBetIds = new Set(next.my_bets.map((bet) => bet.id));
            const missingBets = previousSnapshot?.my_bets.filter(
              (bet) => bet.round_id === nextRoundId && !nextBetIds.has(bet.id),
            ) ?? [];
            if (missingBets.length) {
              reconciled = {
                ...reconciled,
                my_bets: [...next.my_bets, ...missingBets],
              };
            }
            if (reconciled.round) {
              const previousRound = previousSnapshot?.round;
              const snapshotPublicStateIsOlder = Boolean(
                previousRound
                && reconciled.round.round_bet_count < previousRound.round_bet_count,
              );
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
                  ...(snapshotPublicStateIsOlder && previousRound
                    ? {
                        option_pot_totals: previousRound.option_pot_totals,
                        bettors: previousRound.bettors,
                        player_count: previousRound.player_count,
                        round_bet_count: previousRound.round_bet_count,
                      }
                    : {}),
                },
              };
            }
          }

          snapshotRef.current = reconciled;
          setSnapshot(reconciled);
          setFatalError(null);

          const recoveredRequestIds = new Set(
            next.my_bets.map((bet) => bet.client_request_id),
          );
          const roundChanged = Boolean(previousRoundId && nextRoundId !== previousRoundId);
          let pendingChanged = false;
          for (const [requestId, pendingBet] of pendingBetAmountsRef.current) {
            if (
              recoveredRequestIds.has(requestId)
              || (roundChanged && pendingBet.roundId !== nextRoundId)
            ) {
              pendingBetAmountsRef.current.delete(requestId);
              pendingChanged = true;
            }
          }
          if (pendingChanged) {
            syncPendingBets();
          }

          if (roundChanged) {
            setResultModalOpen(false);
            if (resultCloseTimerRef.current !== null) {
              window.clearTimeout(resultCloseTimerRef.current);
              resultCloseTimerRef.current = null;
            }
            if (resultOpenTimerRef.current !== null) {
              window.clearTimeout(resultOpenTimerRef.current);
              resultOpenTimerRef.current = null;
            }
          }

          if (reconciled.round?.result && reconciled.round.id !== revealedRoundIdRef.current) {
            const revealAt = reconciled.round.result.revealed_at
              ? new Date(reconciled.round.result.revealed_at).getTime()
              : 0;
            const ageMs = revealAt ? Date.now() + offset - revealAt : 0;
            openResultModal(reconciled.round.id, {
              animate: ageMs <= TEEN_PATTI_RESULT_LIVE_AGE_MS,
              resultDurationMs: reconciled.round.result_duration_ms,
              resultAgeMs: ageMs,
              resultRevealedAt: reconciled.round.result.revealed_at,
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

    const betAmount = parseCoinAmount(amount);
    if (betAmount === null || betAmount === 0n) {
      pushNotice("error", "This chip value is not valid.");
      return false;
    }
    const currentOption = round.options.find(
      (candidate) => candidate.id === option.id && candidate.is_enabled !== false,
    );
    if (!currentOption) {
      pushNotice("error", "This hand is not available for the current round.");
      void recover("option-unavailable");
      return false;
    }
    const isEnabledChip = round.chip_values.some(
      (chip) => chip.is_enabled !== false && parseCoinAmount(chip.amount) === betAmount,
    );
    if (!isEnabledChip) {
      pushNotice("error", "Choose one of the enabled chip values.");
      void recover("chip-unavailable");
      return false;
    }

    const roundExposure = current.my_bets.reduce(
      (total, bet) => bet.round_id === round.id ? total + BigInt(bet.amount) : total,
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
    pendingBetAmountsRef.current.set(clientRequestId, {
      amount: betAmount,
      optionId: currentOption.id,
      requestId: clientRequestId,
      roundId: round.id,
    });
    syncPendingBets();
    onSubmitted?.();
    let keepPendingUntilRoundChanges = false;
    try {
      const betPayload = {
        round_id: round.id,
        option_id: currentOption.id,
        amount: betAmount.toString(),
        client_request_id: clientRequestId,
      };
      let response;
      try {
        response = await teenPattiApi.placeBet(betPayload);
      } catch (firstError) {
        if (!isUncertainBetError(firstError)) throw firstError;

        // The server may have committed even when the response was lost.
        // Replay the exact same idempotency key so confirmation can never
        // create a second wager.
        pushNotice("info", "Connection interrupted. Confirming your bet…");
        response = await teenPattiApi.placeBet(betPayload);
      }

      updateSnapshot((existing) => {
        if (!existing) return existing;
        const wallet = response.wallet_version >= existing.wallet.version
          ? {
              ...existing.wallet,
              balance: response.wallet_balance,
              version: response.wallet_version,
            }
          : existing.wallet;
        if (existing.round?.id !== response.round_id) {
          return { ...existing, wallet };
        }
        if (existing.my_bets.some((bet) => bet.id === response.bet_id)) {
          return {
            ...existing,
            wallet,
          };
        }
        const optimisticBet: PlayerBet = {
          id: response.bet_id,
          round_id: response.round_id,
          client_request_id: response.client_request_id,
          amount: response.amount,
          accepted_at: response.accepted_at,
          option: currentOption,
          settlement: null,
        };
        return {
          ...existing,
          wallet,
          my_bets: [...existing.my_bets, optimisticBet],
        };
      });

      pushNotice("success", `${formatCoinAmount(response.amount)} on ${currentOption.name}`);
      return true;
    } catch (error) {
      if (isUncertainBetError(error)) {
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
  }, [pushNotice, recover, serverOffsetMs, syncPendingBets, updateSnapshot]);

  useEffect(() => {
    mountedRef.current = true;
    let socket: Socket | null = null;

    const handleDurableEvent = (payload: { event_id?: string }, action: () => void) => {
      if (eventAlreadySeen(payload?.event_id, seenEventIdsRef.current)) return;
      action();
    };

    const onConnected = () => {
      setConnected(true);
      // Betting deadlines come from PostgreSQL. Keep the last snapshot-derived
      // DB clock offset instead of replacing it with the app-server handshake
      // clock; the connect handler immediately queues an authoritative refresh.
    };

    const onDisconnect = () => setConnected(false);

    const patchRound = (
      roundId: string,
      patch: Partial<NonNullable<TeenPattiSnapshot["round"]>>,
    ) => {
      updateSnapshot((current) => {
        if (!current?.round || current.round.id !== roundId) return current;
        return { ...current, round: { ...current.round, ...patch } };
      });
    };

    const onRoundRefresh = (payload: { event_id?: string }) => {
      handleDurableEvent(payload, () => void recover("socket-round"));
    };

    const onRoundLocked = (payload: RoundLockedEvent) => {
      handleDurableEvent(payload, () => {
        patchRound(payload.round_id, { status: "betting_locked" });
        void recover("socket-round");
      });
    };

    const onRoundDrawing = (payload: RoundDrawingEvent) => {
      handleDurableEvent(payload, () => {
        patchRound(payload.round_id, {
          status: "drawing",
          drawing_started_at: payload.drawing_started_at ?? snapshotRef.current?.round?.drawing_started_at,
          result_reveal_at: payload.result_reveal_at ?? snapshotRef.current?.round?.result_reveal_at,
        });
        void recover("socket-round");
      });
    };

    const onPlatformGameRefresh = (payload: { event_id?: string; game_code?: string }) => {
      if (payload.game_code !== "TEEN_PATTI") return;
      onRoundRefresh(payload);
    };

    const onRoundResult = (payload: RoundResultEvent) => {
      handleDurableEvent(payload, () => {
        const currentRound = snapshotRef.current?.round;
        if (currentRound?.id !== payload.round_id) {
          // Durable result delivery can arrive after its round has left the
          // screen. Refresh state, but never arm a modal for that old round.
          void recover("socket-result-round-mismatch");
          return;
        }
        const existingResult = currentRound.result;
        const winningOptionExists = currentRound.options.some(
          (option) => option.id === payload.winning_option.id,
        );
        const revealedAt = new Date(payload.revealed_at).getTime();
        if (
          !winningOptionExists
          || !Number.isFinite(revealedAt)
          || (existingResult
            && (
              existingResult.round_id !== payload.round_id
              || existingResult.winning_option.id !== payload.winning_option.id
              || existingResult.revealed_at !== payload.revealed_at
            ))
        ) {
          void recover("socket-result-invalid");
          return;
        }
        const resultAgeMs = Math.max(
          0,
          Date.now() + serverOffsetRef.current - revealedAt,
        );
        updateSnapshot((current) => mergeResultIntoSnapshot(current, payload) ?? current);
        openResultModal(payload.round_id, {
          animate: resultAgeMs <= TEEN_PATTI_RESULT_LIVE_AGE_MS,
          resultDurationMs:
            snapshotRef.current?.round?.result_duration_ms
            ?? snapshotRef.current?.active_config?.result_duration_ms,
          resultAgeMs,
          resultRevealedAt: payload.revealed_at,
        });
        void recover("socket-result");
      });
    };

    const onBetAccepted = (payload: BetAcceptedEvent) => {
      handleDurableEvent(payload, () => {
        updateSnapshot((current) => {
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
            return { ...current, wallet };
          }
          const option = current.round.options.find((item) => item.id === payload.option_id);
          if (!option) {
            return { ...current, wallet };
          }
          const optimisticBet: PlayerBet = {
            id: payload.bet_id,
            round_id: payload.round_id,
            client_request_id: payload.client_request_id,
            amount: payload.amount,
            accepted_at: payload.accepted_at,
            option,
            settlement: null,
          };
          return {
            ...current,
            wallet,
            my_bets: [...current.my_bets, optimisticBet],
          };
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
        const currentSnapshot = snapshotRef.current;
        const currentRound = currentSnapshot?.round;
        if (!currentSnapshot || !currentRound) {
          void recover("socket-public-bet-missing-round");
          return;
        }
        if (currentRound.id !== payload.round_id) {
          // This can be a stale event or evidence that the local round is stale.
          void recover("socket-public-bet-round-mismatch");
          return;
        }

        if (
          !Number.isSafeInteger(currentRound.round_bet_count)
          || currentRound.round_bet_count < 0
          || !Number.isSafeInteger(payload.round_bet_count)
          || payload.round_bet_count < 1
        ) {
          void recover("socket-public-bet-invalid-watermark");
          return;
        }
        if (payload.round_bet_count <= currentRound.round_bet_count) {
          // The snapshot or an earlier socket delivery already includes this
          // tap. Aggregate values are authoritative at that newer watermark.
          return;
        }
        if (payload.round_bet_count !== currentRound.round_bet_count + 1) {
          // Applying an event across a gap would leave other bettors and pots
          // incomplete. A snapshot is the only safe way to cross the gap.
          void recover("socket-public-bet-gap");
          return;
        }

        const amount = parseCoinAmount(payload.amount);
        const userTotal = parseCoinAmount(payload.user_total_amount);
        const optionTotal = parseCoinAmount(payload.option_total_amount);
        const acceptedAt = new Date(payload.accepted_at).getTime();
        const firstBetAt = new Date(payload.first_bet_at).getTime();
        const lastBetAt = new Date(payload.last_bet_at).getTime();
        const optionExists = currentRound.options.some(
          (option) => option.id === payload.option_id,
        );
        if (
          !payload.bet_id
          || !payload.user_id
          || !optionExists
          || amount === null
          || amount === 0n
          || userTotal === null
          || userTotal < amount
          || optionTotal === null
          || optionTotal < amount
          || optionTotal < userTotal
          || !Number.isSafeInteger(payload.bet_count)
          || payload.bet_count < 1
          || !Number.isSafeInteger(payload.player_count)
          || payload.player_count < 1
          || !Number.isFinite(acceptedAt)
          || !Number.isFinite(firstBetAt)
          || !Number.isFinite(lastBetAt)
          || firstBetAt > lastBetAt
        ) {
          void recover("socket-public-bet-invalid");
          return;
        }

        const currentBettors = currentRound.bettors ?? [];
        const existingIndex = currentBettors.findIndex(
          (bettor) => bettor.round_id === payload.round_id
            && bettor.option_id === payload.option_id
            && bettor.user_id === payload.user_id,
        );
        const previousAggregate = existingIndex >= 0
          ? currentBettors[existingIndex]
          : null;
        const previousUserTotal = previousAggregate
          ? parseCoinAmount(previousAggregate.total_amount)
          : 0n;
        const previousFirstBetAt = previousAggregate
          ? new Date(previousAggregate.first_bet_at).getTime()
          : null;
        const previousLastBetAt = previousAggregate
          ? new Date(previousAggregate.last_bet_at).getTime()
          : null;
        const currentPotTotals = currentRound.option_pot_totals ?? [];
        const potIndex = currentPotTotals.findIndex(
          (row) => row.option_id === payload.option_id,
        );
        const previousOptionTotal = potIndex >= 0
          ? parseCoinAmount(currentPotTotals[potIndex].total_amount)
          : 0n;
        const userAlreadyAtTable = currentBettors.some(
          (bettor) => bettor.round_id === payload.round_id
            && bettor.user_id === payload.user_id,
        );
        const expectedPlayerCount = currentRound.player_count + (userAlreadyAtTable ? 0 : 1);

        if (
          previousUserTotal === null
          || previousOptionTotal === null
          || !Number.isSafeInteger(currentRound.player_count)
          || currentRound.player_count < 0
          || payload.bet_count !== (previousAggregate?.bet_count ?? 0) + 1
          || userTotal !== previousUserTotal + amount
          || optionTotal !== previousOptionTotal + amount
          || payload.player_count !== expectedPlayerCount
          || (previousAggregate
            && (
              !Number.isSafeInteger(previousAggregate.bet_count)
              || previousAggregate.bet_count < 1
              || previousFirstBetAt === null
              || !Number.isFinite(previousFirstBetAt)
              || previousLastBetAt === null
              || !Number.isFinite(previousLastBetAt)
              || firstBetAt !== previousFirstBetAt
              || lastBetAt < previousLastBetAt
            ))
        ) {
          // Never merge an impossible aggregate and then try to repair it:
          // the poisoned maximum could otherwise survive every recovery.
          void recover("socket-public-bet-inconsistent");
          return;
        }

        const identityFallback = previousAggregate
          ?? (currentSnapshot.player.user_id === payload.user_id
            ? currentSnapshot.player
            : null);
        const eventAggregate: PublicBetAggregate = {
          round_id: payload.round_id,
          option_id: payload.option_id,
          user_id: payload.user_id,
          // Preserve a profile already learned from a snapshot when an older
          // event producer still emits nullable identity fields.
          display_name: payload.display_name ?? identityFallback?.display_name ?? null,
          avatar_url: payload.avatar_url ?? identityFallback?.avatar_url ?? null,
          total_amount: payload.user_total_amount,
          bet_count: payload.bet_count,
          first_bet_at: payload.first_bet_at,
          last_bet_at: payload.last_bet_at,
        };
        const bettors = existingIndex >= 0
          ? currentBettors.map((bettor, index) => (
              index === existingIndex ? eventAggregate : bettor
            ))
          : [...currentBettors, eventAggregate];
        const optionPotTotals = potIndex >= 0
          ? currentPotTotals.map((row, index) => (
              index === potIndex
                ? { ...row, total_amount: payload.option_total_amount }
                : row
            ))
          : [
              ...currentPotTotals,
              { option_id: payload.option_id, total_amount: payload.option_total_amount },
            ];

        const updated: TeenPattiSnapshot = {
          ...currentSnapshot,
          player: currentSnapshot.player.user_id === payload.user_id
            ? {
                ...currentSnapshot.player,
                display_name: payload.display_name ?? currentSnapshot.player.display_name,
                avatar_url: payload.avatar_url ?? currentSnapshot.player.avatar_url,
              }
            : currentSnapshot.player,
          round: {
            ...currentRound,
            bettors,
            option_pot_totals: optionPotTotals,
            player_count: payload.player_count,
            round_bet_count: payload.round_bet_count,
          },
        };
        updateSnapshot(() => updated);
      });
    };

    const onWalletUpdate = (payload: WalletBalanceEvent) => {
      handleDurableEvent(payload, () => {
        updateSnapshot((current) => {
          if (!current || current.wallet.id !== payload.wallet_id) return current;
          if (payload.wallet_version < current.wallet.version) return current;
          return {
            ...current,
            wallet: {
              ...current.wallet,
              balance: payload.balance,
              version: payload.wallet_version,
            },
          };
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
      socket.on("teen_patti.round.locked", onRoundLocked);
      socket.on("teen_patti.round.drawing", onRoundDrawing);
      socket.on("teen_patti.round.result", onRoundResult);
      socket.on("teen_patti.bet.accepted", onBetAccepted);
      socket.on("teen_patti.bet.placed", onPublicBetPlaced);
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
        socket.off("teen_patti.round.locked", onRoundLocked);
        socket.off("teen_patti.round.drawing", onRoundDrawing);
        socket.off("teen_patti.round.result", onRoundResult);
        socket.off("teen_patti.bet.accepted", onBetAccepted);
        socket.off("teen_patti.bet.placed", onPublicBetPlaced);
        socket.off("teen_patti.round.settled", onRoundRefresh);
        socket.off("teen_patti.round.closed", onRoundRefresh);
        socket.off("teen_patti.round.cancelled", onRoundRefresh);
        socket.off("teen_patti.round.refunded", onRoundRefresh);
        socket.off("wallet.balance.updated", onWalletUpdate);
        socket.disconnect();
      }
    };
  }, [openResultModal, pushNotice, recover, syncPendingBets, updateSnapshot]);

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

  const optionPotTotals = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const row of snapshot?.round?.option_pot_totals ?? []) {
      totals.set(row.option_id, BigInt(row.total_amount));
    }
    return totals;
  }, [snapshot?.round?.option_pot_totals]);

  const bettorsByOption = useMemo(() => {
    const grouped = new Map<string, PublicBetAggregate[]>();
    const roundId = snapshot?.round?.id;
    for (const bettor of snapshot?.round?.bettors ?? []) {
      if (bettor.round_id !== roundId) continue;
      const optionBettors = grouped.get(bettor.option_id);
      if (optionBettors) {
        optionBettors.push(bettor);
      } else {
        grouped.set(bettor.option_id, [bettor]);
      }
    }
    for (const optionBettors of grouped.values()) {
      optionBettors.sort((left, right) => {
        const leftTime = new Date(left.last_bet_at).getTime();
        const rightTime = new Date(right.last_bet_at).getTime();
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
          return rightTime - leftTime;
        }
        const leftAmount = parseCoinAmount(left.total_amount) ?? 0n;
        const rightAmount = parseCoinAmount(right.total_amount) ?? 0n;
        if (leftAmount !== rightAmount) return leftAmount > rightAmount ? -1 : 1;
        return left.user_id.localeCompare(right.user_id);
      });
    }
    return grouped as ReadonlyMap<string, PublicBetAggregate[]>;
  }, [snapshot?.round?.bettors, snapshot?.round?.id]);

  const playerCount = useMemo(() => {
    const aggregateCount = new Set(
      (snapshot?.round?.bettors ?? [])
        .filter((bettor) => bettor.round_id === snapshot?.round?.id)
        .map((bettor) => bettor.user_id),
    ).size;
    return Math.max(snapshot?.round?.player_count ?? 0, aggregateCount);
  }, [snapshot?.round?.bettors, snapshot?.round?.id, snapshot?.round?.player_count]);

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
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    optionPotTotals,
    bettorsByOption,
    playerCount,
    recover,
    placeBet,
  };
}

function formatCoinAmount(value: string): string {
  try {
    return `${BigInt(value).toLocaleString()} coins`;
  } catch {
    return `${value} coins`;
  }
}
