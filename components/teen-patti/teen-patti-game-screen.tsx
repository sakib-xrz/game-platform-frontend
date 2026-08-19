"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CircleHelp, House, RefreshCw, VolumeX, X } from "lucide-react";
import { TEEN_PATTI_REVEAL_MS, useTeenPattiGame } from "@/hooks/use-teen-patti-game";
import { formatInteger } from "@/lib/format";
import { GameNotice } from "@/components/greedy/game-notice";
import { BetFlyLayer, type FlyChip } from "@/components/teen-patti/bet-fly-layer";
import { DeckColumn, type DeckVisualPhase } from "@/components/teen-patti/deck-column";
import { TeenPattiChipTray } from "@/components/teen-patti/teen-patti-chip-tray";
import { TeenPattiPhaseRing } from "@/components/teen-patti/teen-patti-phase-ring";
import { TeenPattiResultModal } from "@/components/teen-patti/teen-patti-result-modal";
import type { PublicDeck } from "@/types/teen-patti";

const CHIP_FLY_COLORS = ["#ff5d64", "#3aa06b", "#3c8de6", "#7d51e0", "#f2a03c", "#1f2531"];

function TeenPattiLoading() {
  return (
    <main className="mobile-canvas greedy-shell tp-shell">
      <div className="tp-table tp-table--loading" aria-hidden="true">
        <div className="tp-skeleton tp-skeleton--bar" />
        <div className="tp-skeleton tp-skeleton--stage" />
        <div className="tp-skeleton-decks">
          <div className="tp-skeleton tp-skeleton--deck" />
          <div className="tp-skeleton tp-skeleton--deck" />
          <div className="tp-skeleton tp-skeleton--deck" />
        </div>
      </div>
    </main>
  );
}

function resolveDeckPhase(status: string | undefined, hasResult: boolean, revealStep: "waiting" | "flipping" | "winner"): DeckVisualPhase {
  if (hasResult) {
    if (revealStep === "winner") return "winner";
    if (revealStep === "flipping") return "flipping";
    return "settled";
  }
  if (status === "betting_locked" || status === "result_ready" || status === "drawing") {
    return "dealing";
  }
  return "idle";
}

export function TeenPattiGameScreen() {
  const {
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
  } = useTeenPattiGame();

  const chips = snapshot?.round?.chip_values ?? snapshot?.active_config?.chip_values ?? [];
  const decks = snapshot?.round?.options ?? snapshot?.active_config?.options ?? [];

  const [selectedChip, setSelectedChip] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [revealStep, setRevealStep] = useState<"waiting" | "flipping" | "winner">("waiting");
  const [flyChip, setFlyChip] = useState<FlyChip | null>(null);

  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const lastResultRoundRef = useRef<string | null>(null);
  const flyIdRef = useRef(0);
  const chipTrayRef = useRef<HTMLDivElement>(null);

  const effectiveSelectedChip = chips.some((chip) => chip.amount === selectedChip)
    ? selectedChip
    : (chips[0]?.amount ?? "");

  const round = snapshot?.round ?? null;
  const isBetting = round?.status === "betting_open";
  const winnerId = round?.result?.winning_option.id ?? null;
  const canBet = isBetting && Boolean(effectiveSelectedChip);
  const rakePercent = ((snapshot?.active_config.rake_bps ?? 0) / 100).toFixed(1);
  const hasResult = Boolean(round?.result?.hands?.length);

  useEffect(() => {
    const roundId = round?.id ?? null;
    if (!hasResult || !roundId) {
      if (!hasResult) {
        lastResultRoundRef.current = null;
        setRevealStep("waiting");
      }
      return;
    }

    if (lastResultRoundRef.current === roundId) return;
    lastResultRoundRef.current = roundId;

    const revealedAt = round?.result?.revealed_at
      ? new Date(round.result.revealed_at).getTime()
      : 0;
    const ageMs = revealedAt ? Date.now() + serverOffsetMs - revealedAt : 0;
    if (ageMs >= 2_000) {
      setRevealStep("winner");
      return;
    }

    setRevealStep("flipping");
    const winnerTimer = window.setTimeout(
      () => setRevealStep("winner"),
      Math.max(200, TEEN_PATTI_REVEAL_MS - 300),
    );
    return () => window.clearTimeout(winnerTimer);
  }, [hasResult, round?.id, round?.result?.revealed_at, serverOffsetMs]);

  useEffect(() => {
    if (!helpOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    helpCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [helpOpen]);

  const handleChipSelect = useCallback((amount: string) => {
    setSelectedChip(amount);
  }, []);

  const flyBet = useCallback((deck: PublicDeck, amount: string) => {
    const trayEl = chipTrayRef.current;
    if (!trayEl) return;
    const source = trayEl.querySelector<HTMLButtonElement>(".tp-chip--active") ?? trayEl.querySelector<HTMLButtonElement>(".tp-chip");
    const target = document.querySelector<HTMLButtonElement>(`[data-deck-id="${deck.id}"]`);
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const chipIndex = Math.max(0, chips.findIndex((chip) => chip.amount === amount));
    const color = CHIP_FLY_COLORS[chipIndex % CHIP_FLY_COLORS.length];

    setFlyChip({
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
    });
  }, [chips]);

  const handleDeckPress = useCallback(
    (deck: PublicDeck) => {
      if (!canBet || !effectiveSelectedChip || placingBet) return;
      flyBet(deck, effectiveSelectedChip);
      void placeBet(deck, effectiveSelectedChip);
    },
    [canBet, effectiveSelectedChip, flyBet, placeBet, placingBet],
  );

  const roundLabel = useMemo(() => {
    const roundNumber = snapshot?.round?.round_number;
    return roundNumber ? `Round ${roundNumber}` : "Teen Patti";
  }, [snapshot?.round?.round_number]);

  if (loading && !snapshot) return <TeenPattiLoading />;

  if (!snapshot && fatalError) {
    return (
      <main className="mobile-canvas greedy-shell greedy-fullscreen safe-top safe-bottom flex items-center justify-center bg-[#0b1d13] px-5 text-white">
        <div className="w-full rounded-[30px] border border-white/10 bg-white/6 p-6 text-center shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-3xl">
            ♠
          </div>
          <h1 className="mt-4 text-2xl font-black">Game unavailable</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-white/60">{fatalError}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/" className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">
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

  if (!snapshot) return <TeenPattiLoading />;

  const deckPhase = resolveDeckPhase(round?.status, hasResult, revealStep);
  const latest = snapshot.recent_history.find((item) => item.result?.winning_option);
  const runtimePaused = snapshot.runtime.status !== "running";

  return (
    <main className="mobile-canvas greedy-shell tp-shell">
      <GameNotice notice={notice} />
      <BetFlyLayer chip={flyChip} onDone={() => setFlyChip(null)} />

      <section className="tp-table" aria-label="Teen Patti betting board">
        <div className="tp-felt" aria-hidden="true">
          <span className="tp-felt__glow" />
          <span className="tp-felt__grain" />
        </div>

        <header className="tp-topbar">
          <nav className="tp-controls" aria-label="Game controls">
            <Link href="/" className="tp-control" aria-label="Home">
              <House />
            </Link>
            <button type="button" className="tp-control" aria-label="Sound is unavailable" disabled>
              <VolumeX />
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

          <div className="tp-round-badge">
            <i className={connected ? "is-online" : ""} aria-hidden="true" />
            <span>{roundLabel}</span>
          </div>
        </header>

        <p className="tp-rake">House rake {rakePercent}% · highest unique Teen Patti wins the pot</p>

        <div className="tp-centerpiece">
          <TeenPattiPhaseRing
            round={round}
            config={snapshot.active_config}
            serverOffsetMs={serverOffsetMs}
          />
          <div className="tp-dealer" aria-hidden="true">
            <span className="tp-dealer__card" />
            <span className="tp-dealer__card" />
            <span className="tp-dealer__card" />
            <span className="tp-dealer__label">Dealer</span>
          </div>
        </div>

        <div className="tp-decks">
          {decks.slice(0, 3).map((deck, deckIndex) => {
            const hand = round?.result?.hands?.find((item) => item.option_id === deck.id);
            return (
              <DeckColumn
                key={deck.id}
                deck={deck}
                deckIndex={deckIndex}
                stake={(optionBetTotals.get(deck.id) ?? 0n).toString()}
                winner={winnerId === deck.id}
                disabled={!canBet}
                busy={placingBet}
                hand={hand}
                phase={deckPhase}
                onPress={() => handleDeckPress(deck)}
              />
            );
          })}
        </div>

        <TeenPattiChipTray
          ref={chipTrayRef}
          chips={chips}
          selected={effectiveSelectedChip}
          onChange={handleChipSelect}
          disabled={!round || round.status !== "betting_open" || placingBet}
        />

        <p className="tp-hint">
          {canBet
            ? "Tap one, two, or all three hands"
            : deckPhase === "dealing"
              ? "Cards are dealing…"
              : deckPhase === "flipping"
                ? "Turning the hands…"
                : deckPhase === "winner" || deckPhase === "settled"
                  ? "Round complete — next hand incoming"
                  : "Waiting for the next round"}
        </p>

        {runtimePaused && !round && (
          <div className="tp-paused-overlay" role="status">
            <span>Teen Patti is paused</span>
            <small>Your wallet stays safe. New rounds will appear as soon as the operator resumes the game.</small>
          </div>
        )}
      </section>

      <section className="tp-dashboard" id="teen-patti-wallet">
        <div className="tp-metrics">
          <button
            type="button"
            className="tp-refresh"
            onClick={() => void recover()}
            aria-label="Refresh game state"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
          </button>
          <div className="tp-metric">
            <span>Coins left</span>
            <strong>
              <b aria-hidden="true">●</b>
              {formatInteger(snapshot.wallet.balance)}
            </strong>
          </div>
          <div className="tp-metric">
            <span>This round</span>
            <strong>
              <b aria-hidden="true">●</b>
              {formatInteger(roundBetTotal)}
            </strong>
          </div>
        </div>

        <div className="tp-history" aria-label="Recent results">
          {snapshot.recent_history.slice(0, 8).map((item) => (
            <span key={item.id} className="tp-history__chip">
              {item.result?.winning_option.name ?? "—"}
            </span>
          ))}
          {snapshot.recent_history.length === 0 && (
            <span className="tp-history__empty">No settled rounds yet</span>
          )}
        </div>

        <p className="tp-latest">
          {latest?.result
            ? `Latest: ${latest.result.winning_option.name} · round ${latest.round_number}`
            : "Waiting for the first completed round"}
        </p>
      </section>

      {helpOpen && (
        <div
          className="game-help-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teen-patti-help-title"
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
              ♠
            </span>
            <h2 id="teen-patti-help-title">How to play</h2>
            <ol>
              <li>Pick a coin, then tap one, two, or all three hands to bet.</li>
              <li>After lock, the server deals three 3-card hands from one shuffled deck.</li>
              <li>The unique highest Teen Patti wins. Pot minus rake is split among that hand&rsquo;s bettors.</li>
              <li>Ranking (high → low): Trail · Pure sequence · Sequence · Color · Pair · High card. A-2-3 is the top sequence.</li>
            </ol>
          </div>
        </div>
      )}

      <TeenPattiResultModal
        snapshot={snapshot}
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
      />
    </main>
  );
}
