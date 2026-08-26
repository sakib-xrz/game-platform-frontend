"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/greedy/player-avatar";
import { GameLoadingScreen } from "@/components/game-loading-screen";
import { useGameBoot } from "@/components/game-boot-provider";
import { Lucky77ChipTray } from "@/components/lucky-77/lucky-77-chip-tray";
import { Lucky77OptionCard } from "@/components/lucky-77/lucky-77-option-card";
import { Lucky77ResultModal } from "@/components/lucky-77/lucky-77-result-modal";
import { Lucky77Wheel } from "@/components/lucky-77/lucky-77-wheel";
import { useCountdown } from "@/hooks/use-countdown";
import { useLucky77Game } from "@/hooks/use-lucky-77-game";
import { useLucky77Sound } from "@/hooks/use-lucky-77-sound";
import { Lucky77Symbol, lucky77DisplayName } from "@/lib/lucky-77-art";
import { usePlayerHref } from "@/hooks/use-player-href";
import type { PublicBetAggregate, PublicOption } from "@/types/greedy";

const OPTION_ORDER = ["APPLE", "SEVENTY_SEVEN", "WATERMELON"];
const LAST_BET_KEY = "lucky-77:last-bet";

type LastBet = { optionCode: string; amount: string };

export function Lucky77GameScreen() {
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
    betLandings,
    setResultModalOpen,
    roundBetTotal,
    optionBetTotals,
    recover,
    placeBet,
  } = useLucky77Game();
  const { bootGame, hideBoot } = useGameBoot();
  const homeHref = usePlayerHref("/") ?? "/";
  const { soundEnabled, toggleSound, playSound } = useLucky77Sound();
  const [selectedChip, setSelectedChip] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [lastBet, setLastBet] = useState<LastBet | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const soundedResultRoundRef = useRef<string | null>(null);

  useEffect(() => {
    if (snapshot || fatalError) hideBoot();
  }, [fatalError, hideBoot, snapshot]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(LAST_BET_KEY);
        if (stored) setLastBet(JSON.parse(stored) as LastBet);
      } catch {
        // Repeat simply starts empty when storage is unavailable or malformed.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const status = snapshot?.round?.status ?? null;
    if (status === "drawing" && previousStatusRef.current !== "drawing") {
      playSound("spin");
    } else if (
      status === "betting_locked" &&
      previousStatusRef.current === "betting_open"
    ) {
      playSound("lock");
    }
    previousStatusRef.current = status;
  }, [playSound, snapshot?.round?.status]);

  useEffect(() => {
    const resultRoundId = snapshot?.round?.result?.round_id;
    if (resultRoundId && soundedResultRoundRef.current !== resultRoundId) {
      soundedResultRoundRef.current = resultRoundId;
      playSound("win");
    }
  }, [playSound, snapshot?.round?.result?.round_id]);

  const options = useMemo(
    () => [...(snapshot?.round?.options ?? snapshot?.active_config?.options ?? [])]
      .filter((option) => option.is_enabled !== false)
      .sort((left, right) => {
        const leftIndex = OPTION_ORDER.indexOf(left.code);
        const rightIndex = OPTION_ORDER.indexOf(right.code);
        return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
      }),
    [snapshot?.active_config?.options, snapshot?.round?.options],
  );
  const chips = useMemo(
    () => [...(snapshot?.round?.chip_values ?? snapshot?.active_config?.chip_values ?? [])]
      .filter((chip) => chip.is_enabled !== false)
      .sort((left, right) => left.display_order - right.display_order),
    [snapshot?.active_config?.chip_values, snapshot?.round?.chip_values],
  );
  const bettingMs = useCountdown(
    snapshot?.round?.status === "betting_open"
      ? snapshot.round.betting_ends_at
      : null,
    serverOffsetMs,
  );

  const bettorsByOption = useMemo(() => {
    const groups = new Map<string, PublicBetAggregate[]>();
    for (const bettor of snapshot?.round?.bettors ?? []) {
      const group = groups.get(bettor.option_id) ?? [];
      group.push(bettor);
      groups.set(bettor.option_id, group);
    }
    for (const group of groups.values()) {
      group.sort(
        (left, right) =>
          new Date(right.last_bet_at).getTime() -
          new Date(left.last_bet_at).getTime(),
      );
    }
    return groups;
  }, [snapshot?.round?.bettors]);

  const backedOptionId = snapshot?.my_bets.find(
    (bet) => bet.round_id === snapshot.round?.id,
  )?.option.id ?? pendingOptionIds.values().next().value ?? null;
  const disabledChipAmounts = useMemo(() => {
    const disabled = new Set<string>();
    if (!snapshot?.round) return disabled;
    const available = BigInt(snapshot.wallet.balance) - pendingBetTotal;
    const exposure = BigInt(roundBetTotal) + pendingBetTotal;
    for (const chip of chips) {
      const amount = BigInt(chip.amount);
      if (
        amount < BigInt(snapshot.round.min_bet) ||
        amount > BigInt(snapshot.round.max_single_bet) ||
        amount > available ||
        exposure + amount > BigInt(snapshot.round.max_round_bet)
      ) {
        disabled.add(chip.amount);
      }
    }
    return disabled;
  }, [chips, pendingBetTotal, roundBetTotal, snapshot]);
  const effectiveSelectedChip = chips.some(
    (chip) => chip.amount === selectedChip && !disabledChipAmounts.has(chip.amount),
  )
    ? selectedChip
    : chips.find((chip) => !disabledChipAmounts.has(chip.amount))?.amount ?? "";
  const optimisticWallet = snapshot
    ? BigInt(snapshot.wallet.balance) > pendingBetTotal
      ? BigInt(snapshot.wallet.balance) - pendingBetTotal
      : 0n
    : 0n;
  const canBet = Boolean(
    snapshot?.game.status === "active" &&
      snapshot.round?.status === "betting_open" &&
      bettingMs > 0 &&
      effectiveSelectedChip,
  );

  const runtimeHeld = snapshot?.runtime.status !== "running";
  const gameUnavailable = Boolean(snapshot && snapshot.game.status !== "active");
  const roundStillFinishing = Boolean(
    snapshot?.round && snapshot.round.status !== "closed",
  );
  const finishingHeldRound = Boolean(
    (runtimeHeld || gameUnavailable) && roundStillFinishing,
  );
  const fullHold = Boolean((runtimeHeld || gameUnavailable) && !roundStillFinishing);

  async function handleBet(option: PublicOption, amount: string) {
    const accepted = await placeBet(
      option,
      amount,
      lucky77DisplayName(option.code, option.name),
    );
    if (!accepted) return false;
    playSound("chip");
    const next = { optionCode: option.code, amount };
    setLastBet(next);
    try {
      window.sessionStorage.setItem(LAST_BET_KEY, JSON.stringify(next));
    } catch {
      // The in-memory repeat state still works for this page session.
    }
    return true;
  }

  function repeatBet() {
    const target = backedOptionId
      ? options.find((option) => option.id === backedOptionId)
      : options.find((option) => option.code === lastBet?.optionCode);
    const amount = lastBet?.amount || effectiveSelectedChip;
    if (!target || !amount) return;
    void handleBet(target, amount);
  }

  if (loading && !snapshot) {
    return (
      <>
        <div className="mobile-canvas game-boot-underlay" aria-hidden="true" />
        {!bootGame ? <GameLoadingScreen game="lucky-77" overlay /> : null}
      </>
    );
  }

  if (!snapshot && fatalError) {
    return (
      <main className="mobile-canvas l77-shell l77-shell--centered safe-top safe-bottom">
        <section className="l77-fatal" role="alert">
          <span className="l77-fatal__wheel" aria-hidden="true">77</span>
          <small>Lucky 77</small>
          <h1>Wheel unavailable</h1>
          <p>{fatalError}</p>
          <div>
            <Link href={homeHref}>Back to games</Link>
            <button type="button" onClick={() => void recover()}>Try again</button>
          </div>
        </section>
      </main>
    );
  }

  if (!snapshot) return <GameLoadingScreen game="lucky-77" overlay />;

  const winnerId = snapshot.round?.result?.winning_option.id ?? null;
  const repeatTarget = backedOptionId
    ? options.find((option) => option.id === backedOptionId)
    : options.find((option) => option.code === lastBet?.optionCode);

  return (
    <main className="mobile-canvas l77-shell">
      <header className="l77-toolbar safe-top">
        <Link href={homeHref} aria-label="Back to games" className="l77-toolbar__round-button">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <span className="l77-toolbar__profile" aria-label={`Player ${snapshot.wallet.user_id}`}>
          <PlayerAvatar player={{ user_id: snapshot.wallet.user_id, display_name: null, avatar_url: null }} />
          <i className={connected ? "is-online" : ""} aria-hidden="true" />
        </span>
        <span className="l77-toolbar__spacer" />
        <button type="button" onClick={toggleSound} className="l77-toolbar__round-button" aria-label={soundEnabled ? "Mute sound" : "Enable sound"}>
          {soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => setHelpOpen(true)} className="l77-toolbar__round-button" aria-label="How to play">
          <CircleHelp aria-hidden="true" />
        </button>
      </header>

      {!connected ? <div className="l77-status-note">Reconnecting live bets…</div> : null}
      {finishingHeldRound ? <div className="l77-status-note">Game paused · this round will finish safely</div> : null}

      <div className="l77-playfield">
        <Lucky77Wheel
          round={snapshot.round}
          serverOffsetMs={serverOffsetMs}
          slotMap={snapshot.slot_map}
          options={options}
        />

        {snapshot.round?.status === "betting_open" ? (
          <div key={snapshot.round.id} className="l77-round-banner">
            The Guessing Begins
          </div>
        ) : null}

        <section className="l77-bet-board" aria-label="Lucky 77 betting options">
          {options.slice(0, 3).map((option) => {
            const myBet = (optionBetTotals.get(option.id) ?? 0n) +
              (pendingOptionAmounts.get(option.id) ?? 0n);
            const locked = Boolean(backedOptionId && backedOptionId !== option.id);
            return (
              <Lucky77OptionCard
                key={option.id}
                option={option}
                bettors={bettorsByOption.get(option.id) ?? []}
                myBet={myBet}
                selected={backedOptionId === option.id}
                locked={locked}
                disabled={!canBet}
                busy={pendingOptionIds.has(option.id)}
                winner={winnerId === option.id}
                landings={betLandings.filter((landing) => landing.optionId === option.id)}
                onBet={() => void handleBet(option, effectiveSelectedChip)}
              />
            );
          })}
        </section>

        <section className="l77-history" aria-label="Recent Lucky 77 results">
          <strong>Result:</strong>
          <div>
            {snapshot.recent_history.slice(0, 10).map((item) => {
              const winner = item.result?.winning_option;
              return winner ? (
                <span key={item.id} title={`Round ${item.round_number}: ${lucky77DisplayName(winner.code, winner.name)}`}>
                  <Lucky77Symbol code={winner.code} imageUrl={winner.image_url} />
                </span>
              ) : null;
            })}
            {snapshot.recent_history.length === 0 ? <small>Waiting for the first result</small> : null}
          </div>
          <button type="button" onClick={() => void recover()} aria-label="Refresh game state" className={refreshing ? "is-refreshing" : ""}>↻</button>
        </section>
      </div>

      <Lucky77ChipTray
        chips={chips}
        selected={effectiveSelectedChip}
        disabled={!canBet}
        disabledAmounts={disabledChipAmounts}
        walletBalance={optimisticWallet}
        repeatDisabled={!canBet || !repeatTarget || !(lastBet?.amount || effectiveSelectedChip)}
        onChange={setSelectedChip}
        onRepeat={repeatBet}
      />

      {fullHold ? (
        <section className="l77-hold" role="dialog" aria-modal="true" aria-labelledby="l77-hold-title">
          <span className="l77-hold__orb" aria-hidden="true">77</span>
          <small>Lucky 77</small>
          <h1 id="l77-hold-title">{gameUnavailable ? "Temporarily unavailable" : "Game is paused"}</h1>
          <p>{gameUnavailable ? "The operator has closed this wheel for now." : "No new round will start until the operator resumes the game."} Your wallet and accepted bets remain safe.</p>
          <div>
            <Link href={homeHref}>Back to games</Link>
            <button type="button" onClick={() => void recover()}>Check again</button>
          </div>
        </section>
      ) : null}

      {helpOpen && !resultModalOpen && !fullHold ? (
        <div className="l77-help-backdrop" role="dialog" aria-modal="true" aria-labelledby="l77-help-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
          <section className="l77-help">
            <button type="button" onClick={() => setHelpOpen(false)} aria-label="Close instructions"><X aria-hidden="true" /></button>
            <span className="l77-help__mark" aria-hidden="true">77</span>
            <small>Lucky 77</small>
            <h2 id="l77-help-title">How to play</h2>
            <ol>
              <li>Choose a coin value, then pick Apple, 77, or Watermelon.</li>
              <li>You may stack more coins on that pick, but you cannot switch items during the round.</li>
              <li>Live coins and totals show every player&apos;s accepted bets.</li>
              <li>The wheel stops on the exact server-verified segment; Apple and Watermelon pay 2×, while 77 pays 8×.</li>
            </ol>
          </section>
        </div>
      ) : null}

      <Lucky77ResultModal
        snapshot={snapshot}
        open={resultModalOpen && !fullHold}
        onClose={() => setResultModalOpen(false)}
      />
    </main>
  );
}
