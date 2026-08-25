"use client";

import Link from "next/link";
import {
  CircleHelp,
  History,
  House,
  RefreshCw,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DevPlayerSwitcher } from "@/components/dev-player-switcher";
import { GameLoadingScreen } from "@/components/game-loading-screen";
import { useGameBoot } from "@/components/game-boot-provider";
import { ClassicBettorSheet } from "@/components/greedy-classic/classic-bettor-sheet";
import { ClassicCenterDial } from "@/components/greedy-classic/classic-center-dial";
import { ClassicChipTray } from "@/components/greedy-classic/classic-chip-tray";
import { ClassicHistorySheet } from "@/components/greedy-classic/classic-history-sheet";
import { ClassicOptionCard } from "@/components/greedy-classic/classic-option-card";
import { ClassicResultModal } from "@/components/greedy-classic/classic-result-modal";
import { useCountdown } from "@/hooks/use-countdown";
import { useGreedyClassicGame } from "@/hooks/use-greedy-classic-game";
import { formatCompactAmount, formatInteger } from "@/lib/format";
import { getClassicOptionDisplayName } from "@/lib/greedy-classic-art";
import { withPlayerQuery } from "@/lib/player-identity";
import type { PublicBetAggregate } from "@/types/greedy";

const CLASSIC_OPTION_POSITIONS = [
  { left: 50, top: 12 },
  { left: 75.5, top: 22 },
  { left: 88.5, top: 43 },
  { left: 75.5, top: 64 },
  { left: 50, top: 74 },
  { left: 24.5, top: 64 },
  { left: 11.5, top: 43 },
  { left: 24.5, top: 22 },
] as const;

export function GreedyClassicGameScreen() {
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
  } = useGreedyClassicGame();
  const { bootGame, hideBoot } = useGameBoot();
  const [selectedChip, setSelectedChip] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bettorSelection, setBettorSelection] = useState<{
    roundId: string;
    optionId: string;
  } | null>(null);
  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const holdHomeRef = useRef<HTMLAnchorElement>(null);
  const holdRetryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (snapshot || fatalError) hideBoot();
  }, [fatalError, hideBoot, snapshot]);

  const chips = useMemo(
    () =>
      (
        snapshot?.round?.chip_values ??
        snapshot?.active_config?.chip_values ??
        []
      )
        .filter((chip) => chip.is_enabled !== false)
        .sort((left, right) => left.display_order - right.display_order),
    [snapshot?.active_config?.chip_values, snapshot?.round?.chip_values],
  );
  const options = useMemo(
    () =>
      [...(snapshot?.round?.options ?? snapshot?.active_config?.options ?? [])]
        .filter((option) => option.is_enabled !== false)
        .sort((left, right) => left.display_order - right.display_order),
    [snapshot?.active_config?.options, snapshot?.round?.options],
  );

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

  const effectiveSelectedChip = chips.some(
    (chip) =>
      chip.amount === selectedChip && !disabledChipAmounts.has(chip.amount),
  )
    ? selectedChip
    : (chips.find((chip) => !disabledChipAmounts.has(chip.amount))?.amount ??
      "");
  const optimisticWallet = snapshot
    ? BigInt(snapshot.wallet.balance) > pendingBetTotal
      ? BigInt(snapshot.wallet.balance) - pendingBetTotal
      : 0n
    : 0n;
  const optimisticSelection = BigInt(roundBetTotal) + pendingBetTotal;
  const isDrawing = snapshot?.round?.status === "drawing";
  const drawingMs = useCountdown(
    isDrawing ? snapshot?.round?.result_reveal_at : null,
    serverOffsetMs,
  );
  const bettingMs = useCountdown(
    snapshot?.round?.status === "betting_open"
      ? snapshot.round.betting_ends_at
      : null,
    serverOffsetMs,
  );
  const drawingFocusIndex =
    isDrawing && options.length
      ? Math.abs(Math.floor(drawingMs / 360)) % Math.min(options.length, 8)
      : -1;
  const winnerId = snapshot?.round?.result?.winning_option.id ?? null;

  const bettorsByOption = useMemo(() => {
    const grouped = new Map<string, PublicBetAggregate[]>();
    for (const bettor of snapshot?.round?.bettors ?? []) {
      const group = grouped.get(bettor.option_id) ?? [];
      group.push(bettor);
      grouped.set(bettor.option_id, group);
    }
    for (const group of grouped.values()) {
      group.sort(
        (left, right) =>
          new Date(right.last_bet_at).getTime() -
          new Date(left.last_bet_at).getTime(),
      );
    }
    return grouped;
  }, [snapshot?.round]);

  const canBet =
    snapshot?.game.status === "active" &&
    snapshot?.round?.status === "betting_open" &&
    bettingMs > 0 &&
    Boolean(effectiveSelectedChip);
  const runtimeHeld = snapshot?.runtime.status !== "running";
  const roundStillFinishing = Boolean(
    snapshot?.round && snapshot.round.status !== "closed",
  );
  const gameUnavailable = Boolean(
    snapshot && snapshot.game.status !== "active",
  );
  const operatorHeld = runtimeHeld || gameUnavailable;
  const finishingHeldRound = Boolean(operatorHeld && roundStillFinishing);
  const fullHold = Boolean(operatorHeld && !roundStillFinishing);
  const fullHoldVisible = fullHold && !resultModalOpen;
  const helpVisible = helpOpen && !resultModalOpen && !fullHoldVisible;

  const bettorOption =
    bettorSelection && bettorSelection.roundId === snapshot?.round?.id
      ? (options.find((option) => option.id === bettorSelection.optionId) ??
        null)
      : null;
  const selectedBettors = bettorOption
    ? (bettorsByOption.get(bettorOption.id) ?? [])
    : [];

  useEffect(() => {
    if (!helpVisible) return;
    const previousFocus =
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
      previousFocus?.focus();
    };
  }, [helpVisible]);

  useEffect(() => {
    if (!fullHoldVisible) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const frame = window.requestAnimationFrame(() =>
      holdHomeRef.current?.focus(),
    );
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === holdHomeRef.current) {
        event.preventDefault();
        holdRetryRef.current?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === holdRetryRef.current
      ) {
        event.preventDefault();
        holdHomeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [fullHoldVisible]);

  if (loading && !snapshot) {
    return (
      <>
        <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
        {!bootGame ? <GameLoadingScreen game="greedy-classic" overlay /> : null}
      </>
    );
  }

  if (!snapshot && fatalError) {
    return (
      <main className="mobile-canvas gc-shell gc-shell--centered safe-top safe-bottom">
        <section className="gc-fatal" role="alert">
          <span className="gc-fatal__art" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/greedy-classic/pause-platter.png" alt="" />
          </span>
          <small>Greedy Classic</small>
          <h1>Game unavailable</h1>
          <p>{fatalError}</p>
          <div>
            <Link href={withPlayerQuery("/")}>Back to games</Link>
            <button type="button" onClick={() => void recover()}>
              Retry
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!snapshot) {
    return <GameLoadingScreen game="greedy-classic" overlay />;
  }

  return (
    <main className="mobile-canvas gc-shell">
      <DevPlayerSwitcher variant="compact" />

      <header className="gc-toolbar safe-top">
        <nav aria-label="Game controls">
          <Link
            href={withPlayerQuery("/")}
            className="gc-toolbar__button"
            aria-label="Home"
          >
            <House aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="gc-toolbar__button"
            aria-label="Sound is unavailable"
            title="Sound is unavailable in this build"
            disabled
          >
            <VolumeX aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gc-toolbar__button"
            aria-label="How to play"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gc-toolbar__button"
            aria-label="Recent results"
            onClick={() => setHistoryOpen(true)}
          >
            <History aria-hidden="true" />
          </button>
        </nav>

        <div
          className="gc-toolbar__wallet"
          aria-label={`${formatInteger(optimisticWallet)} coins available`}
        >
          <i className={connected ? "is-online" : ""} aria-hidden="true" />
          <span>
            <small>{connected ? "Coins" : "Reconnecting"}</small>
            <strong>{formatInteger(optimisticWallet)}</strong>
          </span>
        </div>
      </header>

      {!connected ? (
        <div className="gc-connection-note" role="status">
          Live updates are reconnecting. Bets still use the secure game API.
        </div>
      ) : null}

      {finishingHeldRound ? (
        <div className="gc-pause-note" role="status">
          {gameUnavailable ? "Table unavailable" : "Paused by the operator"}
          {" · this round will finish safely"}
        </div>
      ) : null}

      <section className="gc-arena" aria-label="Greedy Classic betting board">
        <span className="gc-arena__rays" aria-hidden="true" />
        <svg
          className="gc-arena__spokes"
          viewBox="0 0 713 860"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {CLASSIC_OPTION_POSITIONS.map((position) => (
            <line
              key={`${position.left}-${position.top}`}
              className="gc-arena__spoke"
              x1="356.5"
              y1="369.8"
              x2={(position.left / 100) * 713}
              y2={(position.top / 100) * 860}
            />
          ))}
        </svg>

        {options.slice(0, 8).map((option, index) => {
          const position =
            CLASSIC_OPTION_POSITIONS[index] ?? CLASSIC_OPTION_POSITIONS[0];
          return (
            <ClassicOptionCard
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
              onPress={() =>
                void placeBet(
                  option,
                  effectiveSelectedChip,
                  getClassicOptionDisplayName(
                    option.code,
                    option.name,
                    option.image_url,
                  ),
                )
              }
              onViewBettors={() => {
                if (!snapshot.round) return;
                setBettorSelection({
                  roundId: snapshot.round.id,
                  optionId: option.id,
                });
              }}
            />
          );
        })}

        <ClassicCenterDial
          round={snapshot.round}
          serverOffsetMs={serverOffsetMs}
        />

        <div className="gc-kiosk gc-kiosk--salad" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/greedy-classic/salad.png" alt="" />
          <span>Salad</span>
        </div>
        <div className="gc-kiosk gc-kiosk--pizza" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/greedy-classic/pizza.png" alt="" />
          <span>Pizza</span>
        </div>

        {isDrawing ? (
          <span className="gc-arena__draw-dimmer" aria-hidden="true" />
        ) : null}
      </section>

      <section className="gc-deck">
        <div className="gc-deck__metrics">
          <button
            type="button"
            onClick={() => void recover()}
            aria-label="Refresh game state"
            className="gc-deck__refresh"
          >
            <RefreshCw
              className={refreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </button>
          <span>
            <small>
              {snapshot.round
                ? `Round ${snapshot.round.round_number}`
                : "Next round"}
            </small>
            <strong>{connected ? "Live" : "Syncing"}</strong>
          </span>
          <span>
            <small>Your selection</small>
            <strong>{formatCompactAmount(optimisticSelection)}</strong>
          </span>
        </div>

        <ClassicChipTray
          chips={chips}
          selected={effectiveSelectedChip}
          onChange={setSelectedChip}
          disabled={
            snapshot.game.status !== "active" ||
            !snapshot.round ||
            snapshot.round.status !== "betting_open" ||
            bettingMs <= 0
          }
          disabledAmounts={disabledChipAmounts}
        />
      </section>

      {fullHoldVisible ? (
        <section
          className="gc-hold"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gc-hold-title"
          aria-describedby="gc-hold-description"
        >
          <span className="gc-hold__glow" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/greedy-classic/pause-platter.png" alt="" />
          <small>Greedy Classic</small>
          <h1 id="gc-hold-title">
            {gameUnavailable ? "Temporarily unavailable" : "Game is paused"}
          </h1>
          <p id="gc-hold-description">
            {gameUnavailable
              ? "The operator has temporarily closed this table. Your wallet remains safe."
              : "No new round will start until the operator resumes the game. Your wallet remains safe."}
          </p>
          <div>
            <Link ref={holdHomeRef} href={withPlayerQuery("/")}>
              Back to games
            </Link>
            <button
              ref={holdRetryRef}
              type="button"
              onClick={() => void recover()}
            >
              Check again
            </button>
          </div>
        </section>
      ) : null}

      {helpVisible ? (
        <div
          className="gc-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gc-help-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHelpOpen(false);
          }}
        >
          <section className="gc-help">
            <button
              ref={helpCloseRef}
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Close instructions"
            >
              <X aria-hidden="true" />
            </button>
            <span aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/greedy-classic/center-feast.png" alt="" />
            </span>
            <small>Greedy Classic</small>
            <h2 id="gc-help-title">How to play</h2>
            <ol>
              <li>Choose a coin value from the silver tray.</li>
              <li>
                Tap one or several food cards before the center timer reaches
                zero.
              </li>
              <li>
                Every tap places a real bet immediately; your selection total
                updates below.
              </li>
              <li>
                The server publishes the verified winner after the drawing
                animation.
              </li>
            </ol>
          </section>
        </div>
      ) : null}

      <ClassicHistorySheet
        history={snapshot.recent_history}
        open={historyOpen && !resultModalOpen && !fullHoldVisible}
        onClose={() => setHistoryOpen(false)}
      />
      <ClassicBettorSheet
        option={bettorOption}
        bettors={selectedBettors}
        open={
          Boolean(bettorOption) &&
          !resultModalOpen &&
          !historyOpen &&
          !fullHoldVisible
        }
        onClose={() => setBettorSelection(null)}
      />
      <ClassicResultModal
        snapshot={snapshot}
        open={resultModalOpen}
        displayDurationMs={resultModalDisplayMs}
        onClose={() => setResultModalOpen(false)}
      />
    </main>
  );
}
