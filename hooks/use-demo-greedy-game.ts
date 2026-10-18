"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_BOT_NAMES,
  DEMO_GREEDY_CATALOGS,
  payoutAmount,
  pickWeightedIndex,
  type DemoGreedyCatalog,
  type DemoGreedyKind,
  type DemoOption,
} from "@/lib/demo/demo-catalog";
import { createDemoWallet, DEMO_PLAYER, readDemoBalance, writeDemoBalance } from "@/lib/demo/demo-wallet";
import { showToast } from "@/lib/toast";
import type {
  GreedySnapshot,
  PlayerBet,
  PlayerIdentity,
  PublicBetAggregate,
  PublicOption,
  RecentRound,
  RoundResult,
  SnapshotRound,
} from "@/types/greedy";

type BetLanding = {
  id: string;
  optionId: string;
  amount?: string;
  acceptedAt?: string;
  bettor?: PlayerIdentity;
  isMine?: boolean;
};

type Phase = "betting_open" | "betting_locked" | "drawing" | "result_revealed";

type EngineRound = {
  id: string;
  number: number;
  phase: Phase;
  phaseEndsAt: number;
  startedAt: number;
  winnerIndex: number | null;
  slotIndex: number | null;
  drawingStartedAt: number | null;
  revealAt: number | null;
  payoutApplied: boolean;
  bettors: PublicBetAggregate[];
  myBets: PlayerBet[];
  nextFakeAt: number;
};

function publicOption(option: DemoOption): PublicOption {
  return {
    id: option.id,
    code: option.code,
    name: option.name,
    image_url: option.image_url,
    display_order: option.display_order,
    payout_numerator: option.payout_numerator,
    payout_denominator: option.payout_denominator,
    payout_multiplier: option.payout_multiplier,
    is_enabled: true,
  };
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function createRound(catalog: DemoGreedyCatalog, number: number, now: number): EngineRound {
  return {
    id: `demo-${catalog.kind}-${number}`,
    number,
    phase: "betting_open",
    phaseEndsAt: now + catalog.betting_duration_ms,
    startedAt: now,
    winnerIndex: null,
    slotIndex: null,
    drawingStartedAt: null,
    revealAt: null,
    payoutApplied: false,
    bettors: [],
    myBets: [],
    nextFakeAt: now + 700 + Math.floor(Math.random() * 800),
  };
}

function chooseWinner(catalog: DemoGreedyCatalog, round: EngineRound): void {
  const winnerIndex = pickWeightedIndex(catalog.options.map((option) => option.weight));
  round.winnerIndex = winnerIndex;
  const winner = catalog.options[winnerIndex];
  if (catalog.slotMap && winner) {
    const slots = catalog.slotMap
      .map((code, index) => ({ code, index }))
      .filter((slot) => slot.code === winner.code);
    round.slotIndex = slots[Math.floor(Math.random() * slots.length)]?.index ?? 0;
  }
}

function addAggregate(
  round: EngineRound,
  identity: PlayerIdentity,
  optionId: string,
  amount: bigint,
  at: string,
): void {
  const existing = round.bettors.find(
    (bettor) => bettor.user_id === identity.user_id && bettor.option_id === optionId,
  );
  if (existing) {
    existing.total_amount = (BigInt(existing.total_amount) + amount).toString();
    existing.bet_count += 1;
    existing.last_bet_at = at;
    return;
  }
  round.bettors.push({
    ...identity,
    round_id: round.id,
    option_id: optionId,
    total_amount: amount.toString(),
    bet_count: 1,
    first_bet_at: at,
    last_bet_at: at,
  });
}

function buildRound(catalog: DemoGreedyCatalog, round: EngineRound): SnapshotRound {
  const options = catalog.options.map(publicOption);
  const winner = round.winnerIndex === null ? null : options[round.winnerIndex] ?? null;
  const revealAt = round.revealAt;
  const showDraw = round.phase === "drawing" || round.phase === "result_revealed";
  const result: RoundResult | null = winner && round.phase === "result_revealed" && revealAt
    ? {
        round_id: round.id,
        revealed_at: iso(revealAt),
        winning_option: winner,
        winning_option_index: round.winnerIndex ?? undefined,
        winning_slot_index: round.slotIndex ?? undefined,
        top_winners: round.bettors
          .filter((bettor) => bettor.option_id === winner.id)
          .slice()
          .sort((left, right) => (BigInt(right.total_amount) > BigInt(left.total_amount) ? 1 : -1))
          .slice(0, 3)
          .map((bettor, index) => ({
            rank: index + 1,
            user_id: bettor.user_id,
            display_name: bettor.display_name,
            avatar_url: bettor.avatar_url,
            winning_stake: bettor.total_amount,
            total_payout: payoutAmount(
              BigInt(bettor.total_amount),
              winner.payout_numerator,
              winner.payout_denominator,
            ).toString(),
            bet_count: bettor.bet_count,
            first_bet_at: bettor.first_bet_at,
          })),
      }
    : null;

  return {
    id: round.id,
    config_version_id: `demo-${catalog.kind}`,
    round_number: String(round.number),
    status: round.phase,
    betting_duration_ms: catalog.betting_duration_ms,
    lock_duration_ms: catalog.lock_duration_ms,
    drawing_duration_ms: catalog.drawing_duration_ms,
    result_duration_ms: catalog.result_duration_ms,
    min_bet: catalog.min_bet,
    max_single_bet: catalog.max_single_bet,
    max_round_bet: catalog.max_round_bet,
    betting_started_at: iso(round.startedAt),
    betting_ends_at: iso(round.startedAt + catalog.betting_duration_ms),
    drawing_started_at: showDraw && round.drawingStartedAt ? iso(round.drawingStartedAt) : null,
    result_reveal_at: showDraw && revealAt ? iso(revealAt) : null,
    options,
    chip_values: catalog.chips,
    bettors: round.bettors.map((bettor) => ({ ...bettor })),
    winning_option_index: round.phase === "drawing" || round.phase === "result_revealed"
      ? round.winnerIndex
      : null,
    winning_slot_index: round.phase === "drawing" || round.phase === "result_revealed"
      ? round.slotIndex
      : null,
    result,
  };
}

function buildSnapshot(
  catalog: DemoGreedyCatalog,
  round: EngineRound,
  history: RecentRound[],
  balance: bigint,
  version: number,
): GreedySnapshot {
  const activeOptions = catalog.options.map(publicOption);
  return {
    server_time: new Date().toISOString(),
    game: { code: catalog.gameCode, name: catalog.gameName, status: "active" },
    runtime: { status: "running", revision: "demo" },
    slot_map: catalog.slotMap,
    active_config: {
      id: `demo-${catalog.kind}`,
      version: 1,
      betting_duration_ms: catalog.betting_duration_ms,
      lock_duration_ms: catalog.lock_duration_ms,
      drawing_duration_ms: catalog.drawing_duration_ms,
      result_duration_ms: catalog.result_duration_ms,
      min_bet: catalog.min_bet,
      max_single_bet: catalog.max_single_bet,
      max_round_bet: catalog.max_round_bet,
      options: activeOptions,
      chip_values: catalog.chips,
    },
    round: buildRound(catalog, round),
    wallet: createDemoWallet(balance, version),
    my_bets: round.myBets.map((bet) => ({ ...bet, option: { ...bet.option } })),
    recent_history: history,
  };
}

export function useDemoGreedyGame(kind: DemoGreedyKind) {
  const catalog = DEMO_GREEDY_CATALOGS[kind];
  const [snapshot, setSnapshot] = useState<GreedySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [betLandings, setBetLandings] = useState<BetLanding[]>([]);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultModalDisplayMs, setResultModalDisplayMs] = useState(catalog.result_duration_ms);

  const snapshotRef = useRef<GreedySnapshot | null>(null);
  const roundRef = useRef<EngineRound | null>(null);
  const historyRef = useRef<RecentRound[]>([]);
  const numberRef = useRef(1);
  const walletVersionRef = useRef(1);
  const revealedRef = useRef<string | null>(null);
  const landingTimersRef = useRef(new Set<number>());

  const publish = useCallback(() => {
    const round = roundRef.current;
    if (!round) return;
    const next = buildSnapshot(
      catalog,
      round,
      historyRef.current,
      readDemoBalance(),
      walletVersionRef.current,
    );
    snapshotRef.current = next;
    setSnapshot(next);
  }, [catalog]);

  const queueLanding = useCallback((landing: BetLanding) => {
    setBetLandings((current) => [...current, landing].slice(-24));
    const timer = window.setTimeout(() => {
      landingTimersRef.current.delete(timer);
      setBetLandings((current) => current.filter((item) => item.id !== landing.id));
    }, 1_350);
    landingTimersRef.current.add(timer);
  }, []);

  const settle = useCallback((round: EngineRound) => {
    if (round.payoutApplied || round.winnerIndex === null) return;
    round.payoutApplied = true;
    const winner = catalog.options[round.winnerIndex];
    if (!winner) return;
    const stake = round.myBets.reduce(
      (total, bet) => (bet.option.id === winner.id ? total + BigInt(bet.amount) : total),
      0n,
    );
    if (stake > 0n) {
      const payout = payoutAmount(stake, winner.payout_numerator, winner.payout_denominator);
      writeDemoBalance(readDemoBalance() + payout);
      walletVersionRef.current += 1;
      showToast("success", `Round payout: +${payout.toString()} coins`);
    }
    for (const bet of round.myBets) {
      bet.settlement = {
        outcome: bet.option.id === winner.id ? "won" : "lost",
        payout_amount: bet.option.id === winner.id
          ? payoutAmount(BigInt(bet.amount), winner.payout_numerator, winner.payout_denominator).toString()
          : "0",
        settled_at: new Date().toISOString(),
      };
    }
  }, [catalog.options]);

  const advance = useCallback((now: number) => {
    const round = roundRef.current;
    if (!round || now < round.phaseEndsAt) return;
    if (round.phase === "betting_open") {
      round.phase = "betting_locked";
      round.phaseEndsAt = now + catalog.lock_duration_ms;
      return;
    }
    if (round.phase === "betting_locked") {
      chooseWinner(catalog, round);
      round.phase = "drawing";
      round.drawingStartedAt = now;
      round.revealAt = now + catalog.drawing_duration_ms;
      round.phaseEndsAt = round.revealAt;
      return;
    }
    if (round.phase === "drawing") {
      settle(round);
      round.phase = "result_revealed";
      round.phaseEndsAt = now + catalog.result_duration_ms;
      if (revealedRef.current !== round.id) {
        revealedRef.current = round.id;
        setResultModalDisplayMs(catalog.result_duration_ms);
        setResultModalOpen(true);
      }
      return;
    }
    const finished = buildRound(catalog, round);
    historyRef.current = [
      {
        id: round.id,
        round_number: String(round.number),
        status: "settled",
        result_reveal_at: finished.result_reveal_at,
        closed_at: iso(now),
        result: finished.result,
      },
      ...historyRef.current,
    ].slice(0, 16);
    numberRef.current += 1;
    roundRef.current = createRound(catalog, numberRef.current, now);
    setResultModalOpen(false);
    setBetLandings([]);
  }, [catalog, settle]);

  const spawnFakeBet = useCallback((now: number) => {
    const round = roundRef.current;
    if (!round || round.phase !== "betting_open" || now < round.nextFakeAt) return;
    round.nextFakeAt = now + 900 + Math.floor(Math.random() * 900);
    if (round.bettors.length >= 10 || Math.random() < 0.25) return;
    const option = catalog.options[Math.floor(Math.random() * catalog.options.length)];
    const chip = catalog.chips[Math.floor(Math.random() * catalog.chips.length)];
    if (!option || !chip) return;
    const name = DEMO_BOT_NAMES[Math.floor(Math.random() * DEMO_BOT_NAMES.length)] ?? "Guest";
    const identity: PlayerIdentity = {
      user_id: `demo-bot-${name.toLowerCase()}`,
      display_name: name,
      avatar_url: null,
    };
    const at = iso(now);
    addAggregate(round, identity, option.id, BigInt(chip.amount), at);
    queueLanding({
      id: `fake-${round.id}-${now}`,
      optionId: option.id,
      amount: chip.amount,
      acceptedAt: at,
      bettor: identity,
      isMine: false,
    });
  }, [catalog.chips, catalog.options, queueLanding]);

  useEffect(() => {
    const now = Date.now();
    numberRef.current = 1;
    historyRef.current = [];
    roundRef.current = createRound(catalog, 1, now);
    publish();
    setLoading(false);

    const timer = window.setInterval(() => {
      const tick = Date.now();
      advance(tick);
      spawnFakeBet(tick);
      publish();
    }, 200);

    return () => {
      window.clearInterval(timer);
      for (const landingTimer of landingTimersRef.current) window.clearTimeout(landingTimer);
      landingTimersRef.current.clear();
    };
  }, [advance, catalog, publish, spawnFakeBet]);

  const placeBet = useCallback(async (
    option: PublicOption,
    amount: string,
    optionDisplayName = option.name,
  ) => {
    const round = roundRef.current;
    if (!round) {
      showToast("error", "No active round is available.");
      return false;
    }
    if (round.phase !== "betting_open" || Date.now() >= round.startedAt + catalog.betting_duration_ms) {
      showToast("info", "Betting is closed for this round.");
      return false;
    }
    let betAmount: bigint;
    try {
      betAmount = BigInt(amount);
    } catch {
      showToast("error", "This chip value is not valid.");
      return false;
    }
    if (betAmount < BigInt(catalog.min_bet) || betAmount > BigInt(catalog.max_single_bet)) {
      showToast("error", `Choose a chip between ${catalog.min_bet} and ${catalog.max_single_bet} coins.`);
      return false;
    }
    const exposure = round.myBets.reduce((total, bet) => total + BigInt(bet.amount), 0n);
    if (exposure + betAmount > BigInt(catalog.max_round_bet)) {
      showToast("error", "Round limit reached.");
      return false;
    }
    if (readDemoBalance() < betAmount) {
      showToast("error", "Not enough coins for this chip.");
      return false;
    }
    if (catalog.singleOptionPerRound) {
      const backed = round.myBets[0]?.option.id;
      if (backed && backed !== option.id) {
        showToast("info", "You can back only one Lucky 77 option per round.");
        return false;
      }
    }
    const catalogOption = catalog.options.find((item) => item.id === option.id);
    if (!catalogOption) {
      showToast("error", "This option is not available.");
      return false;
    }

    writeDemoBalance(readDemoBalance() - betAmount);
    walletVersionRef.current += 1;
    const acceptedAt = new Date().toISOString();
    const betId = `demo-bet-${round.id}-${round.myBets.length + 1}`;
    round.myBets.push({
      id: betId,
      round_id: round.id,
      amount: betAmount.toString(),
      accepted_at: acceptedAt,
      option: publicOption(catalogOption),
      settlement: null,
    });
    addAggregate(round, DEMO_PLAYER, option.id, betAmount, acceptedAt);
    queueLanding({
      id: betId,
      optionId: option.id,
      amount: betAmount.toString(),
      acceptedAt,
      bettor: DEMO_PLAYER,
      isMine: true,
    });
    publish();
    showToast("success", `${amount} coins placed on ${optionDisplayName}`);
    return true;
  }, [catalog, publish, queueLanding]);

  const recover = useCallback(async () => {
    publish();
  }, [publish]);

  const roundBetTotal = useMemo(() => {
    const roundId = snapshot?.round?.id;
    return snapshot?.my_bets.reduce(
      (sum, bet) => (bet.round_id === roundId ? sum + BigInt(bet.amount) : sum),
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
    refreshing: false,
    pendingOptionIds: new Set<string>() as ReadonlySet<string>,
    pendingOptionAmounts: new Map<string, bigint>() as ReadonlyMap<string, bigint>,
    pendingBetTotal: 0n,
    connected: true,
    serverOffsetMs: 0,
    fatalError: null as string | null,
    notice: null,
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
