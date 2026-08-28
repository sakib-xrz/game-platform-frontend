"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  House,
  RefreshCw,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { useGameSound } from "@/hooks/use-game-sound";
import { useGreedyGame } from "@/hooks/use-greedy-game";
import { formatInteger } from "@/lib/format";
import {
  greedyDrawFocusIndex,
  resolveGreedyDrawStopIndex,
} from "@/lib/greedy-draw-focus";
import { getOptionDisplayName, OptionArtwork } from "@/lib/option-art";
import { BetOptionNode } from "@/components/greedy/bet-option-node";
import { CenterStage } from "@/components/greedy/center-stage";
import { ChipTray } from "@/components/greedy/chip-tray";
import { RecentResults } from "@/components/greedy/recent-results";
import { ResultModal } from "@/components/greedy/result-modal";
import { DevPlayerSwitcher } from "@/components/dev-player-switcher";
import { GameLoadingScreen } from "@/components/game-loading-screen";
import { useGameBoot } from "@/components/game-boot-provider";
import { usePlayerHref } from "@/hooks/use-player-href";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

const LIVE_RESULT_SOUND_MAX_AGE_MS = 2_000;

// A 129px orbit keeps every node circular and evenly spaced while reserving
// a 9px visual safety gap below the toolbar and round banner at 414px.
const NODE_POSITIONS = [
  { left: 50, top: 18.392857 },
  { left: 72.033037, top: 25.139862 },
  { left: 81.15942, top: 41.428571 },
  { left: 72.033037, top: 57.717281 },
  { left: 50, top: 64.464286 },
  { left: 27.966963, top: 57.717281 },
  { left: 18.84058, top: 41.428571 },
  { left: 27.966963, top: 25.139862 },
] as const;

const SPOKE_POINTS = [
  [207, 103],
  [298.217, 140.783],
  [336, 232],
  [298.217, 323.217],
  [207, 361],
  [115.783, 323.217],
  [78, 232],
  [115.783, 140.783],
] as const;

function MachineIllustration() {
  return (
    <svg
      className="machine-illustration"
      viewBox="0 0 414 560"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="greedy-stripes"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-16)"
        >
          <rect width="13" height="26" fill="#129ad7" />
          <rect x="13" width="13" height="26" fill="#29bceb" />
        </pattern>
        <linearGradient id="platform-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#29c2ef" />
          <stop offset="1" stopColor="#10aee6" />
        </linearGradient>
      </defs>

      <g className="machine-spokes">
        {SPOKE_POINTS.map(([x, y], index) => {
          const rivetX = 207 + (x - 207) * 0.58;
          const rivetY = 232 + (y - 232) * 0.58;
          return (
            <g key={index}>
              <line
                x1="207"
                y1="232"
                x2={x}
                y2={y}
                stroke="#173f58"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <line
                x1="207"
                y1="232"
                x2={x}
                y2={y}
                stroke="#39b8e5"
                strokeWidth="11"
                strokeLinecap="round"
              />
              <circle
                cx={rivetX}
                cy={rivetY}
                r="2.6"
                fill="#ffe978"
                stroke="#184764"
                strokeWidth="1.4"
              />
            </g>
          );
        })}
      </g>

      <g className="machine-legs">
        <path d="M174 265 L198 273 L151 438 L120 438 Z" fill="#123e58" />
        <path
          d="M178 270 L193 275 L146 432 L127 432 Z"
          fill="url(#greedy-stripes)"
        />
        <path d="M240 265 L216 273 L263 438 L294 438 Z" fill="#123e58" />
        <path
          d="M236 270 L221 275 L268 432 L287 432 Z"
          fill="url(#greedy-stripes)"
        />
        <rect x="198" y="276" width="18" height="160" rx="8" fill="#123e58" />
        <rect x="202" y="279" width="10" height="153" rx="5" fill="#38b9e7" />
        <rect
          x="116"
          y="431"
          width="41"
          height="8"
          rx="3"
          fill="#41c4ef"
          stroke="#163e58"
          strokeWidth="2"
        />
        <rect
          x="257"
          y="431"
          width="41"
          height="8"
          rx="3"
          fill="#41c4ef"
          stroke="#163e58"
          strokeWidth="2"
        />
      </g>

      <path
        d="M47 421 H367 L402 545 Q406 558 393 558 H21 Q8 558 12 545 Z"
        fill="#123d58"
      />
      <path
        d="M49 427 H365 L396 544 Q398 552 389 552 H25 Q16 552 18 544 Z"
        fill="url(#platform-blue)"
      />
      <path
        d="M81 512 H333 L349 556 H65 Z"
        fill="#ffe877"
        stroke="#153f59"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function GreedyGameScreen() {
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
    resultModalDisplayMs,
    betLandings,
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    recover,
    placeBet,
  } = useGreedyGame();
  const { bootGame, hideBoot } = useGameBoot();
  const homeHref = usePlayerHref("/") ?? "/";
  const { soundEnabled, toggleSound, playSound } = useGameSound();
  const previousStatusRef = useRef<string | null>(null);
  const soundedResultRoundRef = useRef<string | null>(null);
  const previousDrawingFocusRef = useRef(-1);

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
  const options = useMemo(
    () =>
      [...(snapshot?.round?.options ?? snapshot?.active_config?.options ?? [])]
        .filter((option) => option.is_enabled !== false)
        .sort((a, b) => a.display_order - b.display_order),
    [snapshot?.active_config?.options, snapshot?.round?.options],
  );
  const [selectedChip, setSelectedChip] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const disabledChipAmounts = useMemo(() => {
    const disabled = new Set<string>();
    if (!snapshot?.round) return disabled;
    const balance = BigInt(snapshot.wallet.balance) - pendingBetTotal;
    const exposure = BigInt(roundBetTotal) + pendingBetTotal;
    const minBet = BigInt(snapshot.round.min_bet);
    const maxSingleBet = BigInt(snapshot.round.max_single_bet);
    const maxRoundBet = BigInt(snapshot.round.max_round_bet);
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
  }, [chips, pendingBetTotal, roundBetTotal, snapshot]);

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

  const isDrawing = snapshot?.round?.status === "drawing";
  const drawingMs = useCountdown(
    isDrawing ? snapshot?.round?.result_reveal_at : null,
    serverOffsetMs,
  );
  const bettingRemainingMs = useCountdown(
    snapshot?.round?.status === "betting_open"
      ? snapshot.round.betting_ends_at
      : null,
    serverOffsetMs,
  );
  const winnerId = snapshot?.round?.result?.winning_option.id ?? null;
  const drawStopIndex = resolveGreedyDrawStopIndex({
    winningOptionIndex: snapshot?.round?.winning_option_index,
    winnerId,
    options,
  });
  const drawingFocusIndex = isDrawing
    ? greedyDrawFocusIndex({
        isDrawing: true,
        roundId: snapshot?.round?.id,
        optionCount: options.length,
        durationMs:
          snapshot?.round?.drawing_duration_ms ??
          snapshot?.active_config?.drawing_duration_ms ??
          3_000,
        drawingMs,
        stopIndex: drawStopIndex,
        drawingStartedAt: snapshot?.round?.drawing_started_at,
        resultRevealAt: snapshot?.round?.result_reveal_at,
        serverOffsetMs,
      })
    : drawStopIndex !== null && resultModalOpen
      ? drawStopIndex
      : -1;

  useEffect(() => {
    const status = snapshot?.round?.status ?? null;
    if (
      status === "betting_locked" &&
      previousStatusRef.current === "betting_open"
    ) {
      playSound("lock");
    }
    previousStatusRef.current = status;
  }, [playSound, snapshot?.round?.status]);

  useEffect(() => {
    if (
      drawingFocusIndex >= 0 &&
      previousDrawingFocusRef.current !== drawingFocusIndex
    ) {
      playSound("tick");
    }
    previousDrawingFocusRef.current = drawingFocusIndex;
  }, [drawingFocusIndex, playSound]);

  useEffect(() => {
    const result = snapshot?.round?.result;
    const resultRoundId = result?.round_id;
    if (!resultRoundId || soundedResultRoundRef.current === resultRoundId) {
      return;
    }
    soundedResultRoundRef.current = resultRoundId;
    const revealedAtMs = result.revealed_at
      ? new Date(result.revealed_at).getTime()
      : Number.NaN;
    const resultAgeMs = Number.isFinite(revealedAtMs)
      ? Math.max(0, Date.now() + serverOffsetMs - revealedAtMs)
      : 0;
    if (resultAgeMs > LIVE_RESULT_SOUND_MAX_AGE_MS) return;
    const winningOptionId = result.winning_option.id;
    const playerWon =
      (optionBetTotals.get(winningOptionId) ?? 0n) > 0n ||
      (pendingOptionAmounts.get(winningOptionId) ?? 0n) > 0n;
    playSound(playerWon ? "win" : "lose");
  }, [
    optionBetTotals,
    pendingOptionAmounts,
    playSound,
    serverOffsetMs,
    snapshot?.round?.result,
  ]);

  const handleChipSelect = useCallback(
    (amount: string) => {
      setSelectedChip(amount);
      playSound("chip");
    },
    [playSound],
  );

  const handlePlaceBet = useCallback(
    async (option: PublicOption, amount: string) => {
      const accepted = await placeBet(option, amount);
      if (accepted) playSound("bet");
    },
    [placeBet, playSound],
  );

  const bettorsByOption = useMemo(() => {
    const grouped = new Map<string, PublicBetAggregate[]>();
    for (const bettor of snapshot?.round?.bettors ?? []) {
      const bettors = grouped.get(bettor.option_id) ?? [];
      bettors.push(bettor);
      grouped.set(bettor.option_id, bettors);
    }
    for (const bettors of grouped.values()) {
      bettors.sort(
        (a, b) =>
          new Date(b.last_bet_at).getTime() - new Date(a.last_bet_at).getTime(),
      );
    }
    return grouped;
  }, [snapshot?.round]);

  const joinedPlayerCount = useMemo(() => {
    const ids = new Set<string>();
    for (const bettor of snapshot?.round?.bettors ?? []) {
      ids.add(bettor.user_id);
    }
    return ids.size;
  }, [snapshot?.round?.bettors]);

  const canBet =
    snapshot?.game.status === "active" &&
    snapshot?.round?.status === "betting_open" &&
    bettingRemainingMs > 0 &&
    Boolean(effectiveSelectedChip);

  const roundLabel = useMemo(() => {
    const roundNumber = snapshot?.round?.round_number;
    return roundNumber ? `Today’s ${roundNumber} Round` : "Today’s Round";
  }, [snapshot?.round?.round_number]);

  useEffect(() => {
    if (!helpOpen) return;

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
  }, [helpOpen]);

  if (loading && !snapshot) {
    return (
      <>
        <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
        {!bootGame ? <GameLoadingScreen game="greedy" overlay /> : null}
      </>
    );
  }

  if (!snapshot && fatalError) {
    return (
      <main className="mobile-canvas greedy-shell greedy-fullscreen safe-top safe-bottom flex items-center justify-center bg-[#17191f] px-5 text-white">
        <div className="w-full rounded-[30px] border border-white/10 bg-white/6 p-6 text-center shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-3xl">
            🎯
          </div>
          <h1 className="mt-4 text-2xl font-black">Game unavailable</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-white/60">
            {fatalError}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              href={homeHref}
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
        {!bootGame ? <GameLoadingScreen game="greedy" overlay /> : null}
      </>
    );
  }

  const latestRound = snapshot.recent_history.find(
    (item) => item.result?.winning_option,
  );
  const latestResult = latestRound?.result?.winning_option;
  const latestResultName = latestResult
    ? getOptionDisplayName(latestResult.code, latestResult.name)
    : null;

  return (
    <main className="mobile-canvas greedy-shell greedy-game-shell text-[#14243d]">
      <DevPlayerSwitcher variant="compact" />

      <section
        className="greedy-machine game-dot-bg"
        aria-label="Greedy betting board"
      >
        <MachineIllustration />

        <nav className="machine-toolbar" aria-label="Game controls">
          <Link href={homeHref} className="machine-control" aria-label="Home">
            <House />
          </Link>
          <button
            type="button"
            className="machine-control"
            aria-label={soundEnabled ? "Mute sound" : "Enable sound"}
            title={soundEnabled ? "Mute game sounds" : "Enable game sounds"}
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </button>
          <span
            className="machine-control machine-control--players"
            aria-label={`${joinedPlayerCount} players in this round`}
            title="Players who joined this round"
          >
            <Users aria-hidden="true" />
            <strong className="machine-players-count">
              {joinedPlayerCount}
            </strong>
          </span>
        </nav>

        <div className="machine-round-label">
          <i className={connected ? "is-online" : ""} aria-hidden="true" />
          <span>{roundLabel}</span>
        </div>

        <span
          className="machine-decoration machine-decoration--carrot"
          aria-hidden="true"
        >
          🥕
        </span>
        <span
          className="machine-decoration machine-decoration--gem-left"
          aria-hidden="true"
        />
        <span
          className="machine-decoration machine-decoration--gem-right"
          aria-hidden="true"
        />

        <div className="machine-kiosk machine-kiosk--left" aria-hidden="true">
          <span>🥗</span>
          <small>Salad</small>
        </div>
        <div className="machine-kiosk machine-kiosk--right" aria-hidden="true">
          <span>🍕</span>
          <small>Pizza</small>
        </div>

        <div className="machine-rate px-2" aria-label="Single currency betting">
          <span className="game-coin" aria-hidden="true" /> 1 coin = 1 stake
        </div>

        {options.slice(0, 8).map((option, index) => {
          const position = NODE_POSITIONS[index] ?? NODE_POSITIONS[0];
          return (
            <BetOptionNode
              key={option.id}
              option={option}
              left={position.left}
              top={position.top}
              myBet={(
                (optionBetTotals.get(option.id) ?? 0n) +
                (pendingOptionAmounts.get(option.id) ?? 0n)
              ).toString()}
              winner={winnerId === option.id}
              drawingHighlighted={drawingFocusIndex === index}
              disabled={!canBet}
              busy={pendingOptionIds.has(option.id)}
              bettors={bettorsByOption.get(option.id) ?? []}
              landingIds={betLandings
                .filter((landing) => landing.optionId === option.id)
                .map((landing) => landing.id)}
              onPress={() => void handlePlaceBet(option, effectiveSelectedChip)}
            />
          );
        })}

        <CenterStage round={snapshot.round} serverOffsetMs={serverOffsetMs} />

        <ChipTray
          chips={chips}
          selected={effectiveSelectedChip}
          onChange={handleChipSelect}
          disabledAmounts={disabledChipAmounts}
          disabled={
            !snapshot.round ||
            snapshot.round.status !== "betting_open" ||
            bettingRemainingMs <= 0
          }
        />

        <div className="machine-quick-bet" aria-hidden="true">
          <span>Quick selection</span>
          <strong>Choose a coin and bet here ›</strong>
        </div>

        {isDrawing && (
          <div className="machine-draw-dimmer" aria-hidden="true" />
        )}
      </section>

      <section className="greedy-dashboard" id="greedy-history">
        <div className="dashboard-metrics">
          <button
            type="button"
            className="dashboard-refresh"
            onClick={() => void recover()}
            aria-label="Refresh game state"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
          </button>
          <div className="dashboard-metric">
            <span>Coins left</span>
            <strong>
              <b aria-hidden="true">●</b>
              {formatInteger(optimisticWalletBalance.toString())}
            </strong>
          </div>
          <div className="dashboard-metric">
            <span>Round selection</span>
            <strong>
              <b aria-hidden="true">●</b>
              {formatInteger(optimisticRoundBetTotal.toString())}
            </strong>
          </div>
        </div>

        {snapshot.runtime.status !== "running" && !snapshot.round && (
          <div className="dashboard-runtime-note">
            Game rounds are paused. Your wallet remains safe.
          </div>
        )}

        <RecentResults history={snapshot.recent_history} />

        <div className="dashboard-ranking">
          <div className="dashboard-ranking__avatar">
            {latestResult ? (
              <OptionArtwork
                imageUrl={latestResult.image_url}
                code={latestResult.code}
                name={latestResultName ?? latestResult.name}
                className="dashboard-ranking__art"
              />
            ) : (
              <ShieldCheck aria-hidden="true" />
            )}
          </div>
          <div className="dashboard-ranking__copy">
            <strong>Latest verified result</strong>
            <span>
              {latestResult && latestRound
                ? `Round ${latestRound.round_number} · ${latestResultName ?? latestResult.name}`
                : "Waiting for the first completed round"}
            </span>
          </div>
          <ShieldCheck
            className="dashboard-ranking__verified"
            aria-hidden="true"
          />
        </div>
      </section>

      {helpOpen && (
        <div
          className="game-help-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="greedy-help-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHelpOpen(false);
          }}
        >
          <div className="game-help-card">
            <button
              ref={helpCloseRef}
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Close instructions"
            >
              <X />
            </button>
            <span className="game-help-card__art" aria-hidden="true">
              🍽️
            </span>
            <h2 id="greedy-help-title">How to play</h2>
            <ol>
              <li>Choose a coin value on the blue stand.</li>
              <li>
                Tap one or several options before the timer reaches zero. Every
                tap places another bet immediately.
              </li>
              <li>
                Options highlight in sequence during the draw. The last
                highlight is the verified winner from the server.
              </li>
            </ol>
          </div>
        </div>
      )}

      <ResultModal
        snapshot={snapshot}
        open={resultModalOpen}
        displayDurationMs={resultModalDisplayMs}
        onClose={() => setResultModalOpen(false)}
      />
    </main>
  );
}
