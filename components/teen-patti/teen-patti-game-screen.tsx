"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleHelp,
  ChevronLeft,
  RefreshCw,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { useTeenPattiGame } from "@/hooks/use-teen-patti-game";
import { formatInteger } from "@/lib/format";
import {
  BetFlyLayer,
  type FlyChip,
} from "@/components/teen-patti/bet-fly-layer";
import {
  DeckColumn,
  type DeckVisualPhase,
} from "@/components/teen-patti/deck-column";
import { TeenPattiChipTray } from "@/components/teen-patti/teen-patti-chip-tray";
import { TeenPattiPhaseRing } from "@/components/teen-patti/teen-patti-phase-ring";
import { TeenPattiResultModal } from "@/components/teen-patti/teen-patti-result-modal";
import { TeenPattiBettorListSheet } from "@/components/teen-patti/teen-patti-bettor-list-sheet";
import { TeenPattiHistorySheet } from "@/components/teen-patti/teen-patti-history-sheet";
import { TeenPattiPayoutLayer } from "@/components/teen-patti/teen-patti-payout-layer";
import { DevPlayerSwitcher } from "@/components/dev-player-switcher";
import { GameLoadingScreen } from "@/components/game-loading-screen";
import { useGameBoot } from "@/components/game-boot-provider";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { useTeenPattiSound } from "@/hooks/use-teen-patti-sound";
import type { PublicDeck } from "@/types/teen-patti";

const CHIP_FLY_COLORS = [
  "#25c8ed",
  "#50b449",
  "#438cdb",
  "#7d51e0",
  "#f2a03c",
  "#de7650",
];
const LIVE_RESULT_MAX_AGE_MS = 500;
const WINNER_REVEAL_MS = 1_420;
const PAYOUT_SOUND_MS = 1_470;

const HISTORY_AVATAR_BY_TONE: Record<string, string> = {
  green: "/assets/teen-patti/avatar-emerald.png",
  blue: "/assets/teen-patti/avatar-sapphire.png",
  pink: "/assets/teen-patti/avatar-ruby.png",
};

const TONE_BY_CODE: Record<string, string> = {
  DECK_A: "green",
  DECK_B: "blue",
  DECK_C: "pink",
};

type RepeatBet = {
  optionCode: string;
  amount: string;
};

function resolveDeckPhase(
  status: string | undefined,
  hasResult: boolean,
  opening: boolean,
  winnerReady: boolean,
  bettingRemainingMs: number,
  drawingStartRemainingMs: number,
): DeckVisualPhase {
  if (hasResult) {
    return winnerReady ? "winner" : "flipping";
  }
  if (opening) return "opening";
  if (status === "result_ready" || status === "drawing") {
    return "turning";
  }
  if (status === "betting_locked" || status === "betting_open") {
    if (status === "betting_open" && bettingRemainingMs > 0) return "idle";
    return drawingStartRemainingMs > 0 ? "dealing" : "turning";
  }
  return "idle";
}

function toneForOption(
  optionCode: string | undefined,
  decks: PublicDeck[],
): string {
  const stableTone = optionCode
    ? TONE_BY_CODE[optionCode.toUpperCase()]
    : undefined;
  if (stableTone) return stableTone;
  const index = decks.findIndex((deck) => deck.code === optionCode);
  return ["green", "blue", "pink"][index] ?? "empty";
}

export function TeenPattiGameScreen() {
  const {
    snapshot,
    loading,
    refreshing,
    pendingOptionIds,
    pendingOptionAmounts,
    pendingBetTotal,
    connected,
    serverOffsetMs,
    fatalError,
    resultModalOpen,
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    optionPotTotals,
    bettorsByOption,
    playerCount,
    recover,
    placeBet,
  } = useTeenPattiGame();
  const { bootGame, hideBoot } = useGameBoot();
  const { soundEnabled, toggleSound, playSound } = useTeenPattiSound();

  useEffect(() => {
    if (snapshot || fatalError) hideBoot();
  }, [fatalError, hideBoot, snapshot]);

  const chips = useMemo(
    () =>
      (
        snapshot?.round?.chip_values ??
        snapshot?.active_config?.chip_values ??
        []
      ).filter((chip) => chip.is_enabled !== false),
    [snapshot?.active_config?.chip_values, snapshot?.round?.chip_values],
  );
  const decks = useMemo(
    () =>
      (
        snapshot?.round?.options ??
        snapshot?.active_config?.options ??
        []
      ).filter((deck) => deck.is_enabled !== false),
    [snapshot?.active_config?.options, snapshot?.round?.options],
  );

  const [selectedChip, setSelectedChip] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [flyChips, setFlyChips] = useState<FlyChip[]>([]);
  const [repeatBet, setRepeatBet] = useState<RepeatBet | null>(null);
  const [bettorSheetDeckId, setBettorSheetDeckId] = useState<
    string | "table" | null
  >(null);
  const [historyRoundId, setHistoryRoundId] = useState<string | null>(null);
  const [openingRoundId, setOpeningRoundId] = useState<string | null>(null);
  const [winnerReadyResultKey, setWinnerReadyResultKey] = useState<
    string | null
  >(null);
  const [payoutReadyResultKey, setPayoutReadyResultKey] = useState<
    string | null
  >(null);

  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const flyIdRef = useRef(0);
  const betSequenceRef = useRef(0);
  const lastAcceptedBetSequenceRef = useRef(0);
  const chipTrayRef = useRef<HTMLDivElement>(null);
  const serverOffsetRef = useRef(serverOffsetMs);

  const round = snapshot?.round ?? null;
  const disabledChipAmounts = useMemo(() => {
    const disabled = new Set<string>();
    if (!snapshot || !round) return disabled;
    const balance = BigInt(snapshot.wallet.balance) - pendingBetTotal;
    const exposure = BigInt(roundBetTotal) + pendingBetTotal;
    const minBet = BigInt(round.min_bet);
    const maxSingleBet = BigInt(round.max_single_bet);
    const maxRoundBet = BigInt(round.max_round_bet);
    for (const chip of chips) {
      const amount = BigInt(chip.amount);
      if (
        amount < minBet ||
        amount > maxSingleBet ||
        amount > balance ||
        exposure + amount > maxRoundBet
      ) {
        disabled.add(chip.amount);
      }
    }
    return disabled;
  }, [chips, pendingBetTotal, round, roundBetTotal, snapshot]);

  const optimisticWalletBalance = snapshot
    ? BigInt(snapshot.wallet.balance) > pendingBetTotal
      ? BigInt(snapshot.wallet.balance) - pendingBetTotal
      : 0n
    : 0n;
  const optimisticRoundBetTotal = BigInt(roundBetTotal) + pendingBetTotal;

  const effectiveSelectedChip = chips.some(
    (chip) =>
      chip.amount === selectedChip && !disabledChipAmounts.has(chip.amount),
  )
    ? selectedChip
    : (chips.find((chip) => !disabledChipAmounts.has(chip.amount))?.amount ??
      "");

  const isBetting = round?.status === "betting_open";
  const bettingRemainingMs = useCountdown(
    isBetting ? round?.betting_ends_at : null,
    serverOffsetMs,
  );
  const drawingStartsAt = useMemo(() => {
    if (!round) return null;
    if (round.drawing_started_at) return round.drawing_started_at;
    if (!round.betting_ends_at) return null;
    const bettingEndsMs = new Date(round.betting_ends_at).getTime();
    if (!Number.isFinite(bettingEndsMs)) return null;
    return new Date(bettingEndsMs + round.lock_duration_ms).toISOString();
  }, [round]);
  const drawingStartRemainingMs = useCountdown(
    round?.status === "betting_open" || round?.status === "betting_locked"
      ? drawingStartsAt
      : null,
    serverOffsetMs,
  );
  const winnerId = round?.result?.winning_option.id ?? null;
  const canBet =
    snapshot?.game.status === "active" &&
    isBetting &&
    bettingRemainingMs > 0 &&
    Boolean(effectiveSelectedChip);
  const rakePercent = (
    (round?.rake_bps ?? snapshot?.active_config.rake_bps ?? 0) / 100
  ).toFixed(1);
  const hasResult = Boolean(round?.result?.hands?.length);
  const resultKey = round?.result
    ? `${round.id}:${round.result.revealed_at ?? "revealed"}`
    : null;
  const resultRevealedAt = round?.result?.revealed_at ?? null;
  const allRoundBettors = useMemo(
    () =>
      (round?.bettors ?? []).filter((bettor) => bettor.round_id === round?.id),
    [round?.bettors, round?.id],
  );
  const bettorSheetDeck =
    bettorSheetDeckId && bettorSheetDeckId !== "table"
      ? (decks.find((deck) => deck.id === bettorSheetDeckId) ?? null)
      : null;
  const bettorSheetBettors = bettorSheetDeck
    ? (bettorsByOption.get(bettorSheetDeck.id) ?? [])
    : allRoundBettors;
  const payoutSources = useMemo(
    () =>
      decks.slice(0, 3).map((deck) => {
        const bettors = bettorsByOption.get(deck.id) ?? [];
        const betCount = bettors.reduce(
          (count, bettor) => count + bettor.bet_count,
          0,
        );
        return {
          optionId: deck.id,
          betCount:
            betCount || ((optionPotTotals.get(deck.id) ?? 0n) > 0n ? 1 : 0),
        };
      }),
    [bettorsByOption, decks, optionPotTotals],
  );

  useEffect(() => {
    serverOffsetRef.current = serverOffsetMs;
  }, [serverOffsetMs]);

  useEffect(() => {
    if (!round?.id || round.status !== "betting_open" || hasResult) {
      const clearFrame = window.requestAnimationFrame(() =>
        setOpeningRoundId(null),
      );
      return () => window.cancelAnimationFrame(clearFrame);
    }
    const startFrame = window.requestAnimationFrame(() =>
      setOpeningRoundId(round.id),
    );
    playSound("deal");
    const timer = window.setTimeout(
      () =>
        setOpeningRoundId((current) => (current === round.id ? null : current)),
      1_500,
    );
    return () => {
      window.cancelAnimationFrame(startFrame);
      window.clearTimeout(timer);
    };
  }, [hasResult, playSound, round?.id, round?.status]);

  useEffect(() => {
    if (!resultKey) {
      const clearFrame = window.requestAnimationFrame(() => {
        setWinnerReadyResultKey(null);
        setPayoutReadyResultKey(null);
      });
      return () => window.cancelAnimationFrame(clearFrame);
    }
    const revealedAtMs = resultRevealedAt
      ? new Date(resultRevealedAt).getTime()
      : Number.NaN;
    const resultAgeMs = Number.isFinite(revealedAtMs)
      ? Math.max(0, Date.now() + serverOffsetRef.current - revealedAtMs)
      : 0;
    const timers: number[] = [];
    const setupFrame = window.requestAnimationFrame(() => {
      setPayoutReadyResultKey(null);
      if (resultAgeMs > LIVE_RESULT_MAX_AGE_MS) {
        setWinnerReadyResultKey(resultKey);
        return;
      }

      setWinnerReadyResultKey(null);
      for (const delay of [0, 340, 680]) {
        timers.push(window.setTimeout(() => playSound("flip"), delay));
      }
      timers.push(
        window.setTimeout(() => {
          setWinnerReadyResultKey(resultKey);
          setPayoutReadyResultKey(resultKey);
          playSound("winner");
        }, WINNER_REVEAL_MS),
      );
      timers.push(
        window.setTimeout(() => playSound("payout"), PAYOUT_SOUND_MS),
      );
    });
    return () => {
      window.cancelAnimationFrame(setupFrame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [playSound, resultKey, resultRevealedAt]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      setBettorSheetDeckId(null),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [round?.id]);

  useEffect(() => {
    if (!resultModalOpen) return;
    const frame = window.requestAnimationFrame(() => {
      setHelpOpen(false);
      setBettorSheetDeckId(null);
      setHistoryRoundId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resultModalOpen]);

  useEffect(() => {
    if (!helpOpen || resultModalOpen) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    helpCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpOpen(false);
      if (event.key === "Tab") {
        event.preventDefault();
        helpCloseRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [helpOpen, resultModalOpen]);

  const handleChipSelect = useCallback(
    (amount: string) => {
      setSelectedChip(amount);
      playSound("chip");
    },
    [playSound],
  );
  const handleFlyDone = useCallback((chipId: number) => {
    setFlyChips((current) => current.filter((chip) => chip.id !== chipId));
  }, []);

  const flyBet = useCallback(
    (deck: PublicDeck, amount: string) => {
      const trayEl = chipTrayRef.current;
      if (!trayEl) return;
      const source =
        trayEl.querySelector<HTMLButtonElement>(
          `[data-chip-amount="${amount}"]`,
        ) ??
        trayEl.querySelector<HTMLButtonElement>(".tp-chip--active") ??
        trayEl.querySelector<HTMLButtonElement>(".tp-chip");
      const target = document.querySelector<HTMLButtonElement>(
        `[data-deck-id="${deck.id}"]`,
      );
      if (!source || !target) return;

      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const chipIndex = Math.max(
        0,
        chips.findIndex((chip) => chip.amount === amount),
      );
      const color = CHIP_FLY_COLORS[chipIndex % CHIP_FLY_COLORS.length];

      const nextChip: FlyChip = {
        id: ++flyIdRef.current,
        from: {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2,
        },
        to: {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2 - 40,
        },
        color,
        amount: formatInteger(amount),
      };
      setFlyChips((current) => [...current.slice(-5), nextChip]);
      playSound("bet");
    },
    [chips, playSound],
  );

  const submitBet = useCallback(
    async (deck: PublicDeck, amount: string) => {
      if (!canBet || !amount || disabledChipAmounts.has(amount)) return;
      const betSequence = ++betSequenceRef.current;
      const accepted = await placeBet(deck, amount, () => flyBet(deck, amount));
      if (!accepted) return;

      if (betSequence > lastAcceptedBetSequenceRef.current) {
        lastAcceptedBetSequenceRef.current = betSequence;
        setRepeatBet({ optionCode: deck.code, amount });
      }
    },
    [canBet, disabledChipAmounts, flyBet, placeBet],
  );

  const handleDeckPress = useCallback(
    (deck: PublicDeck) => {
      void submitBet(deck, effectiveSelectedChip);
    },
    [effectiveSelectedChip, submitBet],
  );

  const handleRepeat = useCallback(() => {
    if (!repeatBet || disabledChipAmounts.has(repeatBet.amount)) return;
    const deck = decks.find((item) => item.code === repeatBet.optionCode);
    if (!deck) return;
    setSelectedChip(repeatBet.amount);
    void submitBet(deck, repeatBet.amount);
  }, [decks, disabledChipAmounts, repeatBet, submitBet]);

  const roundLabel = useMemo(() => {
    const roundNumber = snapshot?.round?.round_number;
    return roundNumber ? `Round ${roundNumber}` : "Teen Patti";
  }, [snapshot?.round?.round_number]);

  if (loading && !snapshot) {
    return (
      <>
        <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
        {!bootGame ? <GameLoadingScreen game="teen-patti" overlay /> : null}
      </>
    );
  }

  if (!snapshot && fatalError) {
    return (
      <main className="mobile-canvas greedy-shell greedy-fullscreen safe-top safe-bottom flex items-center justify-center bg-[#0b1d13] px-5 text-white">
        <div className="w-full rounded-[30px] border border-white/10 bg-white/6 p-6 text-center shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-3xl">
            ♠
          </div>
          <h1 className="mt-4 text-2xl font-black">Game unavailable</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-white/60">
            {fatalError}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black"
            >
              Back
            </Link>
            <button
              type="button"
              onClick={() => void recover()}
              className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-900"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <>
        <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
        {!bootGame ? <GameLoadingScreen game="teen-patti" overlay /> : null}
      </>
    );
  }

  const deckPhase = resolveDeckPhase(
    round?.status,
    hasResult,
    openingRoundId === round?.id,
    Boolean(resultKey && winnerReadyResultKey === resultKey),
    bettingRemainingMs,
    drawingStartRemainingMs,
  );
  const currentPlayer = snapshot.player ?? {
    user_id: snapshot.wallet.user_id,
    display_name: null,
    avatar_url: null,
  };
  const runtimePaused = snapshot.runtime.status !== "running";
  const historySlots = Array.from(
    { length: 5 },
    (_, index) => snapshot.recent_history[index] ?? null,
  );
  const selectedHistoryRound = historyRoundId
    ? (snapshot.recent_history.find((item) => item.id === historyRoundId) ??
      null)
    : null;
  const repeatDeck = repeatBet
    ? decks.find((deck) => deck.code === repeatBet.optionCode)
    : undefined;
  const canRepeat = Boolean(
    canBet &&
    repeatBet &&
    repeatDeck &&
    !disabledChipAmounts.has(repeatBet.amount),
  );

  return (
    <main className="mobile-canvas greedy-shell tp-shell">
      <DevPlayerSwitcher variant="compact" />
      {flyChips.map((chip) => (
        <BetFlyLayer key={chip.id} chip={chip} onDone={handleFlyDone} />
      ))}
      <TeenPattiPayoutLayer
        celebrationKey={payoutReadyResultKey}
        winnerOptionId={winnerId}
        sources={payoutSources}
      />

      <section className="tp-table" aria-label="Teen Patti betting board">
        <div className="tp-felt" aria-hidden="true">
          <span className="tp-felt__glow" />
          <span className="tp-felt__grain" />
        </div>

        <span className="tp-deco tp-deco--left" aria-hidden="true">
          ♣
        </span>
        <span className="tp-deco tp-deco--right" aria-hidden="true">
          ♦
        </span>

        <header className="tp-topbar">
          <Link href="/" className="tp-back" aria-label="Back to games">
            <ChevronLeft />
          </Link>

          <div className="tp-brand" aria-label="Teen Patti Royal Table">
            <span className="tp-brand__suits" aria-hidden="true">
              <i>♠</i>
              <i>♥</i>
              <i>♦</i>
              <i>♣</i>
            </span>
            <h1>Teen Patti</h1>
            <small>Royal table</small>
          </div>

          <button
            type="button"
            className="tp-round-badge"
            onClick={() => void recover()}
            aria-label={`${roundLabel}. Refresh game state`}
          >
            <span className="tp-round-badge__status">
              <i className={connected ? "is-online" : ""} aria-hidden="true" />
              <b>{connected ? "Live" : "Linking"}</b>
            </span>
            <span>{roundLabel}</span>
            <RefreshCw
              className={refreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="tp-status-rail">
          <div
            className="tp-player-profile"
            aria-label={
              connected ? "Connected to live game" : "Reconnecting to live game"
            }
          >
            <span className="tp-player-profile__avatar">
              <PlayerAvatar
                player={currentPlayer}
                className="tp-player-profile__avatar-image"
                decorative={false}
              />
            </span>
          </div>

          <div className="tp-history-panel">
            <span className="tp-history-panel__label">Recent winners</span>
            <div className="tp-history" aria-label="Recent winning hands">
              {historySlots.map((item, index) => {
                const option = item?.result?.winning_option;
                const tone = toneForOption(option?.code, decks);
                const avatarSrc = HISTORY_AVATAR_BY_TONE[tone];
                if (!item || !avatarSrc) {
                  return (
                    <span
                      key={`empty-${index}`}
                      className="tp-history__seat tp-history__seat--empty"
                      title="Waiting for result"
                    >
                      <span className="tp-history__empty" aria-hidden="true">
                        ♠
                      </span>
                    </span>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`tp-history__seat tp-history__seat--interactive tp-history__seat--${tone}`}
                    title={`Open Round ${item.round_number} details`}
                    aria-label={`Round ${item.round_number}: ${option?.name ?? "winning hand"}, total bet ${formatInteger(item.total_bet_amount)}. Open details.`}
                    onClick={() => {
                      setHelpOpen(false);
                      setBettorSheetDeckId(null);
                      setHistoryRoundId(item.id);
                    }}
                  >
                    <span className="tp-history__portrait">
                      <Image
                        src={avatarSrc}
                        alt=""
                        aria-hidden="true"
                        width={384}
                        height={384}
                        sizes="30px"
                        className="tp-history__avatar"
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <nav className="tp-controls" aria-label="Game controls">
            <button
              type="button"
              className="tp-control"
              aria-label={`${playerCount} ${playerCount === 1 ? "player" : "players"} betting in this round. View all.`}
              title="View live players"
              onClick={() => setBettorSheetDeckId("table")}
            >
              <UsersRound />
              <span className="tp-control__count" aria-hidden="true">
                {playerCount}
              </span>
            </button>
            <button
              type="button"
              className="tp-control"
              aria-label="Game sound"
              aria-pressed={soundEnabled}
              title={soundEnabled ? "Mute game sounds" : "Enable game sounds"}
              onClick={toggleSound}
            >
              {soundEnabled ? <Volume2 /> : <VolumeX />}
            </button>
            <button
              type="button"
              className="tp-control"
              aria-label="How to play"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp />
            </button>
          </nav>
        </div>

        <div className="tp-arena">
          <span
            className="tp-arena__ornament tp-arena__ornament--left"
            aria-hidden="true"
          />
          <span
            className="tp-arena__ornament tp-arena__ornament--right"
            aria-hidden="true"
          />

          <div className="tp-phase-dock">
            <TeenPattiPhaseRing
              round={round}
              config={round ?? snapshot.active_config}
              serverOffsetMs={serverOffsetMs}
              gameStatus={snapshot.game.status}
              runtimeStatus={snapshot.runtime.status}
            />
            <span className="tp-rake">House rake {rakePercent}%</span>
          </div>

          <div className="tp-decks">
            {decks.slice(0, 3).map((deck, deckIndex) => {
              const hand = round?.result?.hands?.find(
                (item) => item.option_id === deck.id,
              );
              const previewCard = round?.preview_cards?.find(
                (item) => item.option_id === deck.id,
              )?.card;
              const bettors = bettorsByOption.get(deck.id) ?? [];
              return (
                <DeckColumn
                  key={deck.id}
                  deck={deck}
                  deckIndex={deckIndex}
                  stake={(
                    (optionBetTotals.get(deck.id) ?? 0n) +
                    (pendingOptionAmounts.get(deck.id) ?? 0n)
                  ).toString()}
                  potTotal={(optionPotTotals.get(deck.id) ?? 0n).toString()}
                  winner={winnerId === deck.id}
                  disabled={!canBet}
                  busy={pendingOptionIds.has(deck.id)}
                  hand={hand}
                  previewCard={previewCard}
                  bettors={bettors}
                  phase={deckPhase}
                  onPress={() => handleDeckPress(deck)}
                  onViewBettors={() => setBettorSheetDeckId(deck.id)}
                />
              );
            })}
          </div>

          <div className="tp-arena__rule" aria-hidden="true">
            <span>♠</span>
            <b>Three cards. Highest hand wins.</b>
            <span>♥</span>
          </div>
        </div>

        <div className="tp-bet-console">
          <div className="tp-bet-console__status">
            <div
              className="tp-wallet-pill"
              aria-label={`${formatInteger(optimisticWalletBalance.toString())} ${snapshot.wallet.currency.name}`}
            >
              <span className="tp-wallet-pill__coin" aria-hidden="true">
                {snapshot.wallet.currency.symbol ?? "●"}
              </span>
              <span className="tp-wallet-pill__copy">
                <small>Balance</small>
                <strong>
                  {formatInteger(optimisticWalletBalance.toString())}
                </strong>
              </span>
            </div>

            <p className="tp-hint" aria-live="polite">
              <span>
                {canBet
                  ? "Choose a chip, then tap a hand"
                  : snapshot.game.status !== "active"
                    ? "This table is temporarily unavailable"
                    : isBetting
                      ? bettingRemainingMs <= 0
                        ? "Betting is closing"
                        : "No chip is available within your balance and limits"
                      : deckPhase === "dealing"
                        ? "Bets are locked"
                        : deckPhase === "turning"
                          ? "Cards are turning"
                          : deckPhase === "flipping"
                            ? "Revealing cards"
                            : deckPhase === "winner"
                              ? "Highest hand wins"
                              : "Waiting for the next round"}
              </span>
              <strong>
                Bet {formatInteger(optimisticRoundBetTotal.toString())}
              </strong>
            </p>

            <button
              type="button"
              className="tp-repeat"
              disabled={!canRepeat}
              onClick={handleRepeat}
            >
              <RefreshCw aria-hidden="true" />
              <span>Repeat</span>
            </button>
          </div>

          <div className="tp-bet-console__chips">
            <span className="tp-bet-console__label">Select chip</span>
            <TeenPattiChipTray
              ref={chipTrayRef}
              chips={chips}
              selected={effectiveSelectedChip}
              onChange={handleChipSelect}
              disabled={!isBetting || bettingRemainingMs <= 0}
              disabledAmounts={disabledChipAmounts}
            />
          </div>
        </div>

        {runtimePaused && !round && (
          <div className="tp-paused-overlay" role="status">
            <span>Teen Patti is paused</span>
            <small>
              Your wallet stays safe. New rounds will appear as soon as the
              operator resumes the game.
            </small>
          </div>
        )}
      </section>

      {helpOpen && !resultModalOpen && historyRoundId === null && (
        <div
          className="game-help-backdrop tp-help-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teen-patti-help-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHelpOpen(false);
          }}
        >
          <div className="game-help-card tp-help-card">
            <button
              ref={helpCloseRef}
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Close instructions"
            >
              <X />
            </button>
            <span
              className="game-help-card__art tp-help-card__art"
              aria-hidden="true"
            >
              <i>♠</i>
              <i>♥</i>
              <i>♦</i>
            </span>
            <h2 id="teen-patti-help-title">How to play</h2>
            <ol>
              <li>
                Pick an enabled coin, then tap any hand. Every tap is a separate
                bet.
              </li>
              <li>
                You may repeat coins on the same hand or back other hands until
                the timer closes.
              </li>
              <li>
                At round opening, the server shuffles one 52-card deck and
                commits three hands. After lock, the remaining cards turn
                face-up.
              </li>
              <li>
                The unique highest Teen Patti wins. Pot minus rake is split
                among that hand&rsquo;s bettors.
              </li>
              <li>
                Ranking (high → low): Trail · Pure sequence · Sequence · Color ·
                Pair · High card. A-2-3 is the top sequence.
              </li>
              <li>
                Tap the player markers under a hand to see its complete bettor
                list.
              </li>
            </ol>
          </div>
        </div>
      )}

      <TeenPattiResultModal
        snapshot={snapshot}
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
      />
      <TeenPattiBettorListSheet
        deck={bettorSheetDeck}
        bettors={bettorSheetBettors}
        open={
          bettorSheetDeckId !== null &&
          !helpOpen &&
          !resultModalOpen &&
          historyRoundId === null
        }
        onClose={() => setBettorSheetDeckId(null)}
      />
      <TeenPattiHistorySheet
        round={selectedHistoryRound}
        open={
          historyRoundId !== null &&
          !helpOpen &&
          !resultModalOpen &&
          bettorSheetDeckId === null
        }
        onClose={() => setHistoryRoundId(null)}
      />
    </main>
  );
}
