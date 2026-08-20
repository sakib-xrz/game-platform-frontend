"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  ChevronLeft,
  CircleHelp,
  RefreshCw,
  UsersRound,
  VolumeX,
  X,
} from "lucide-react";
import { useTeenPattiGame } from "@/hooks/use-teen-patti-game";
import { formatInteger } from "@/lib/format";
import { GameNotice } from "@/components/greedy/game-notice";
import { BetFlyLayer, type FlyChip } from "@/components/teen-patti/bet-fly-layer";
import { DeckColumn, type DeckVisualPhase } from "@/components/teen-patti/deck-column";
import { TeenPattiChipTray } from "@/components/teen-patti/teen-patti-chip-tray";
import { TeenPattiPhaseRing } from "@/components/teen-patti/teen-patti-phase-ring";
import type { PublicDeck } from "@/types/teen-patti";

const CHIP_FLY_COLORS = ["#25c8ed", "#50b449", "#438cdb", "#7d51e0", "#f2a03c", "#de7650"];

type RepeatBet = {
  optionCode: string;
  amount: string;
};

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

function resolveDeckPhase(status: string | undefined, hasResult: boolean): DeckVisualPhase {
  if (hasResult) {
    return "winner";
  }
  if (status === "betting_locked" || status === "result_ready" || status === "drawing") {
    return "dealing";
  }
  return "idle";
}

function toneForOption(optionCode: string | undefined, decks: PublicDeck[]): string {
  const index = decks.findIndex((deck) => deck.code === optionCode);
  return ["green", "blue", "pink"][index] ?? "empty";
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
    roundBetTotal,
    optionBetTotals,
    recover,
    placeBet,
  } = useTeenPattiGame();

  const chips = useMemo(
    () => snapshot?.round?.chip_values ?? snapshot?.active_config?.chip_values ?? [],
    [snapshot?.active_config?.chip_values, snapshot?.round?.chip_values],
  );
  const decks = useMemo(
    () => snapshot?.round?.options ?? snapshot?.active_config?.options ?? [],
    [snapshot?.active_config?.options, snapshot?.round?.options],
  );

  const [selectedChip, setSelectedChip] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [flyChip, setFlyChip] = useState<FlyChip | null>(null);
  const [repeatBet, setRepeatBet] = useState<RepeatBet | null>(null);

  const helpCloseRef = useRef<HTMLButtonElement>(null);
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
    const source = trayEl.querySelector<HTMLButtonElement>(`[data-chip-amount="${amount}"]`)
      ?? trayEl.querySelector<HTMLButtonElement>(".tp-chip--active")
      ?? trayEl.querySelector<HTMLButtonElement>(".tp-chip");
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

  const submitBet = useCallback(
    async (deck: PublicDeck, amount: string) => {
      if (!canBet || !amount || placingBet) return;
      flyBet(deck, amount);
      const accepted = await placeBet(deck, amount);
      if (!accepted) return;

      const nextRepeatBet = { optionCode: deck.code, amount };
      setRepeatBet(nextRepeatBet);
    },
    [canBet, flyBet, placeBet, placingBet],
  );

  const handleDeckPress = useCallback(
    (deck: PublicDeck) => {
      void submitBet(deck, effectiveSelectedChip);
    },
    [effectiveSelectedChip, submitBet],
  );

  const handleRepeat = useCallback(() => {
    if (!repeatBet) return;
    const deck = decks.find((item) => item.code === repeatBet.optionCode);
    if (!deck) return;
    setSelectedChip(repeatBet.amount);
    void submitBet(deck, repeatBet.amount);
  }, [decks, repeatBet, submitBet]);

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

  const deckPhase = resolveDeckPhase(round?.status, hasResult);
  const runtimePaused = snapshot.runtime.status !== "running";
  const historySlots = Array.from({ length: 5 }, (_, index) => snapshot.recent_history[index] ?? null);
  const canRepeat = Boolean(
    canBet
      && !placingBet
      && repeatBet
      && decks.some((deck) => deck.code === repeatBet.optionCode),
  );

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
          <Link href="/" className="tp-back" aria-label="Back to games">
            <ChevronLeft />
          </Link>
          <h1>TeenPatti</h1>
          <button
            type="button"
            className="tp-round-badge"
            onClick={() => void recover()}
            aria-label={`${roundLabel}. Refresh game state`}
          >
            <i className={connected ? "is-online" : ""} aria-hidden="true" />
            <span>{roundLabel}</span>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
          </button>
        </header>

        <div className="tp-status-rail">
          <div className="tp-player-marker" aria-label={connected ? "Connected" : "Reconnecting"}>
            <Armchair aria-hidden="true" />
            <span>You</span>
          </div>

          <div className="tp-history" aria-label="Recent winning hands">
            {historySlots.map((item, index) => {
              const option = item?.result?.winning_option;
              const tone = toneForOption(option?.code, decks);
              return (
                <span
                  key={item?.id ?? `empty-${index}`}
                  className={`tp-history__seat tp-history__seat--${tone}`}
                  title={option?.name ?? "Waiting for result"}
                >
                  <Armchair aria-hidden="true" />
                </span>
              );
            })}
          </div>

          <nav className="tp-controls" aria-label="Game controls">
            <button type="button" className="tp-control" aria-label="Players">
              <UsersRound />
            </button>
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
        </div>

        <div className="tp-phase-dock">
          <TeenPattiPhaseRing
            round={round}
            config={snapshot.active_config}
            serverOffsetMs={serverOffsetMs}
          />
          <span className="tp-rake">Rake {rakePercent}%</span>
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

        <div className="tp-bet-console">
          <div className="tp-wallet-pill" aria-label={`${formatInteger(snapshot.wallet.balance)} coins`}>
            <span aria-hidden="true">●</span>
            <strong>{formatInteger(snapshot.wallet.balance)}</strong>
          </div>

          <TeenPattiChipTray
            ref={chipTrayRef}
            chips={chips}
            selected={effectiveSelectedChip}
            onChange={handleChipSelect}
            disabled={!round || round.status !== "betting_open" || placingBet}
          />

          <button
            type="button"
            className="tp-repeat"
            disabled={!canRepeat}
            onClick={handleRepeat}
          >
            Repeat
          </button>
        </div>

        <p className="tp-hint" aria-live="polite">
          <span>
            {canBet
              ? "Choose a chip, then tap any hand"
              : deckPhase === "dealing"
                ? "Cards are being dealt"
                : deckPhase === "winner"
                  ? "Highest hand wins"
                  : "Waiting for the next round"}
          </span>
          <strong>Round bet {formatInteger(roundBetTotal)}</strong>
        </p>

        {runtimePaused && !round && (
          <div className="tp-paused-overlay" role="status">
            <span>Teen Patti is paused</span>
            <small>Your wallet stays safe. New rounds will appear as soon as the operator resumes the game.</small>
          </div>
        )}
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

    </main>
  );
}
