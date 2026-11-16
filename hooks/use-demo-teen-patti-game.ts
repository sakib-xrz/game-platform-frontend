"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_BOT_NAMES, DEMO_TEEN_PATTI } from "@/lib/demo/demo-catalog";
import { dealTeenPattiHands, type EvaluatedHand } from "@/lib/demo/teen-patti-rank";
import { createDemoWallet, DEMO_PLAYER, readDemoBalance, writeDemoBalance } from "@/lib/demo/demo-wallet";
import { showToast } from "@/lib/toast";
import type {
  PlayerBet,
  PlayerIdentity,
  PublicBetAggregate,
  PublicDeck,
  RecentRound,
  RoundResult,
  SnapshotRound,
  TeenPattiSnapshot,
} from "@/types/teen-patti";

type Phase = "betting_open" | "betting_locked" | "drawing" | "result_revealed";

type Dealt = EvaluatedHand & { option_id: string; option_code: string };

type EngineRound = {
  id: string;
  number: number;
  phase: Phase;
  phaseEndsAt: number;
  startedAt: number;
  hands: Dealt[];
  winnerIndex: number;
  drawingStartedAt: number | null;
  revealAt: number | null;
  payoutApplied: boolean;
  bettors: PublicBetAggregate[];
  myBets: PlayerBet[];
  betCount: number;
  nextFakeAt: number;
};

function decks(): PublicDeck[] {
  return DEMO_TEEN_PATTI.options.map((option) => ({ ...option, is_enabled: true }));
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function createRound(number: number, now: number): EngineRound {
  const dealt = dealTeenPattiHands(DEMO_TEEN_PATTI.options);
  return {
    id: `demo-teen-patti-${number}`,
    number,
    phase: "betting_open",
    phaseEndsAt: now + DEMO_TEEN_PATTI.betting_duration_ms,
    startedAt: now,
    hands: dealt.hands,
    winnerIndex: dealt.winnerIndex,
    drawingStartedAt: null,
    revealAt: null,
    payoutApplied: false,
    bettors: [],
    myBets: [],
    betCount: 0,
    nextFakeAt: now + 800,
  };
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

function optionPots(round: EngineRound) {
  const totals = new Map<string, bigint>();
  for (const bettor of round.bettors) {
    totals.set(bettor.option_id, (totals.get(bettor.option_id) ?? 0n) + BigInt(bettor.total_amount));
  }
  return [...totals.entries()].map(([option_id, total]) => ({
    option_id,
    total_amount: total.toString(),
  }));
}

function buildResult(round: EngineRound, revealAt: number): RoundResult {
  const winner = round.hands[round.winnerIndex]!;
  const deck = decks().find((item) => item.id === winner.option_id)!;
  return {
    round_id: round.id,
    revealed_at: iso(revealAt),
    winning_option: deck,
    hands: round.hands.map((hand) => ({
      option_id: hand.option_id,
      option_code: hand.option_code,
      cards: hand.cards,
      category: hand.category,
      rank_key: hand.rank_key,
    })),
    top_winners: round.bettors
      .filter((bettor) => bettor.option_id === winner.option_id)
      .slice()
      .sort((left, right) => (BigInt(right.total_amount) > BigInt(left.total_amount) ? 1 : -1))
      .slice(0, 3)
      .map((bettor, index) => ({
        rank: index + 1,
        user_id: bettor.user_id,
        display_name: bettor.display_name,
        avatar_url: bettor.avatar_url,
        winning_stake: bettor.total_amount,
        bet_count: bettor.bet_count,
        total_payout: (BigInt(bettor.total_amount) * 2n).toString(),
        first_bet_at: bettor.first_bet_at,
      })),
  };
}

function buildRound(round: EngineRound): SnapshotRound {
  const revealed = round.phase === "result_revealed";
  const showDraw = round.phase === "drawing" || revealed;
  const revealAt = round.revealAt;
  const options = decks();
  return {
    id: round.id,
    config_version_id: "demo-teen-patti",
    round_number: String(round.number),
    status: round.phase,
    betting_duration_ms: DEMO_TEEN_PATTI.betting_duration_ms,
    lock_duration_ms: DEMO_TEEN_PATTI.lock_duration_ms,
    drawing_duration_ms: DEMO_TEEN_PATTI.drawing_duration_ms,
    result_duration_ms: DEMO_TEEN_PATTI.result_duration_ms,
    min_bet: DEMO_TEEN_PATTI.min_bet,
    max_single_bet: DEMO_TEEN_PATTI.max_single_bet,
    max_round_bet: DEMO_TEEN_PATTI.max_round_bet,
    betting_started_at: iso(round.startedAt),
    betting_ends_at: iso(round.startedAt + DEMO_TEEN_PATTI.betting_duration_ms),
    drawing_started_at: showDraw && round.drawingStartedAt ? iso(round.drawingStartedAt) : null,
    result_reveal_at: showDraw && revealAt ? iso(revealAt) : null,
    options,
    chip_values: DEMO_TEEN_PATTI.chips.map((chip) => ({ ...chip })),
    rake_bps: DEMO_TEEN_PATTI.rake_bps,
    round_bet_count: round.betCount,
    option_pot_totals: optionPots(round),
    bettors: round.bettors.map((bettor) => ({ ...bettor })),
    player_count: new Set(round.bettors.map((bettor) => bettor.user_id)).size,
    preview_cards: round.hands.map((hand) => ({
      option_id: hand.option_id,
      card: hand.cards[0],
    })),
    result_commitment: null,
    result: revealed && revealAt ? buildResult(round, revealAt) : null,
  };
}

function buildSnapshot(round: EngineRound, history: RecentRound[], balance: bigint, version: number): TeenPattiSnapshot {
  const options = decks();
  return {
    server_time: new Date().toISOString(),
    game: { code: DEMO_TEEN_PATTI.gameCode, name: DEMO_TEEN_PATTI.gameName, status: "active" },
    runtime: { status: "running", revision: "demo" },
    active_config: {
      id: "demo-teen-patti",
      version: 1,
      betting_duration_ms: DEMO_TEEN_PATTI.betting_duration_ms,
      lock_duration_ms: DEMO_TEEN_PATTI.lock_duration_ms,
      drawing_duration_ms: DEMO_TEEN_PATTI.drawing_duration_ms,
      result_duration_ms: DEMO_TEEN_PATTI.result_duration_ms,
      min_bet: DEMO_TEEN_PATTI.min_bet,
      max_single_bet: DEMO_TEEN_PATTI.max_single_bet,
      max_round_bet: DEMO_TEEN_PATTI.max_round_bet,
      rake_bps: DEMO_TEEN_PATTI.rake_bps,
      options,
      chip_values: DEMO_TEEN_PATTI.chips.map((chip) => ({ ...chip })),
    },
    round: buildRound(round),
    player: { ...DEMO_PLAYER },
    wallet: createDemoWallet(balance, version),
    my_bets: round.myBets.map((bet) => ({ ...bet, option: { ...bet.option } })),
    recent_history: history,
  };
}

export function useDemoTeenPattiGame() {
  const [snapshot, setSnapshot] = useState<TeenPattiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const roundRef = useRef<EngineRound | null>(null);
  const historyRef = useRef<RecentRound[]>([]);
  const numberRef = useRef(1);
  const walletVersionRef = useRef(1);
  const revealedRef = useRef<string | null>(null);
  const snapshotRef = useRef<TeenPattiSnapshot | null>(null);
  const resultModalTimerRef = useRef<number | null>(null);

  const publish = useCallback(() => {
    const round = roundRef.current;
    if (!round) return;
    const next = buildSnapshot(round, historyRef.current, readDemoBalance(), walletVersionRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
  }, []);

  const settle = useCallback((round: EngineRound) => {
    if (round.payoutApplied) return;
    round.payoutApplied = true;
    const winner = round.hands[round.winnerIndex];
    if (!winner) return;
    const stake = round.myBets.reduce(
      (total, bet) => (bet.option.id === winner.option_id ? total + BigInt(bet.amount) : total),
      0n,
    );
    if (stake > 0n) {
      const payout = stake * 2n;
      writeDemoBalance(readDemoBalance() + payout);
      walletVersionRef.current += 1;
      showToast("success", `Round payout: +${payout.toString()} coins`);
    }
    for (const bet of round.myBets) {
      const won = bet.option.id === winner.option_id;
      bet.settlement = {
        outcome: won ? "won" : "lost",
        payout_amount: won ? (BigInt(bet.amount) * 2n).toString() : "0",
        settled_at: new Date().toISOString(),
      };
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    roundRef.current = createRound(1, now);
    publish();
    setLoading(false);

    const timer = window.setInterval(() => {
      const tick = Date.now();
      const round = roundRef.current;
      if (!round) return;
      if (tick >= round.phaseEndsAt) {
        if (round.phase === "betting_open") {
          round.phase = "betting_locked";
          round.phaseEndsAt = tick + DEMO_TEEN_PATTI.lock_duration_ms;
        } else if (round.phase === "betting_locked") {
          round.drawingStartedAt = tick;
          round.revealAt = tick + DEMO_TEEN_PATTI.drawing_duration_ms;
          round.phase = "drawing";
          round.phaseEndsAt = round.revealAt;
        } else if (round.phase === "drawing") {
          settle(round);
          round.phase = "result_revealed";
          round.phaseEndsAt = tick + DEMO_TEEN_PATTI.result_duration_ms;
          if (revealedRef.current !== round.id) {
            revealedRef.current = round.id;
            if (resultModalTimerRef.current !== null) {
              window.clearTimeout(resultModalTimerRef.current);
            }
            const activeRoundId = round.id;
            // Delay modal until card flip animation & winner announcement finish on the table
            resultModalTimerRef.current = window.setTimeout(() => {
              if (roundRef.current?.id === activeRoundId && roundRef.current?.phase === "result_revealed") {
                setResultModalOpen(true);
              }
            }, 2_200);
          }
        } else {
          if (resultModalTimerRef.current !== null) {
            window.clearTimeout(resultModalTimerRef.current);
            resultModalTimerRef.current = null;
          }
          const finished = buildRound(round);
          const pot = round.bettors.reduce((total, bettor) => total + BigInt(bettor.total_amount), 0n);
          const payout = round.myBets.reduce((total, bet) => {
            return total + BigInt(bet.settlement?.payout_amount ?? "0");
          }, 0n);
          historyRef.current = [
            {
              id: round.id,
              round_number: String(round.number),
              status: "settled",
              result_reveal_at: finished.result_reveal_at,
              closed_at: iso(tick),
              total_bet_amount: pot.toString(),
              total_payout_amount: payout.toString(),
              result: finished.result,
            },
            ...historyRef.current,
          ].slice(0, 16);
          numberRef.current += 1;
          roundRef.current = createRound(numberRef.current, tick);
          setResultModalOpen(false);
        }
      } else if (round.phase === "betting_open" && tick >= round.nextFakeAt && round.bettors.length < 8) {
        round.nextFakeAt = tick + 1_000 + Math.floor(Math.random() * 800);
        if (Math.random() > 0.3) {
          const option = DEMO_TEEN_PATTI.options[Math.floor(Math.random() * DEMO_TEEN_PATTI.options.length)];
          const chip = DEMO_TEEN_PATTI.chips[Math.floor(Math.random() * DEMO_TEEN_PATTI.chips.length)];
          const name = DEMO_BOT_NAMES[Math.floor(Math.random() * DEMO_BOT_NAMES.length)] ?? "Guest";
          if (option && chip) {
            round.betCount += 1;
            addAggregate(round, {
              user_id: `demo-bot-${name.toLowerCase()}`,
              display_name: name,
              avatar_url: null,
            }, option.id, BigInt(chip.amount), iso(tick));
          }
        }
      }
      publish();
    }, 200);

    return () => {
      window.clearInterval(timer);
      if (resultModalTimerRef.current !== null) {
        window.clearTimeout(resultModalTimerRef.current);
      }
    };
  }, [publish, settle]);

  const placeBet = useCallback(async (
    option: PublicDeck,
    amount: string,
    onSubmitted?: () => void,
  ) => {
    const round = roundRef.current;
    if (!round) {
      showToast("error", "No active round is available.");
      return false;
    }
    if (round.phase !== "betting_open" || Date.now() >= round.startedAt + DEMO_TEEN_PATTI.betting_duration_ms) {
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
    const enabled = DEMO_TEEN_PATTI.chips.some((chip) => chip.amount === amount);
    if (!enabled || betAmount < BigInt(DEMO_TEEN_PATTI.min_bet) || betAmount > BigInt(DEMO_TEEN_PATTI.max_single_bet)) {
      showToast("error", "Choose one of the enabled chip values.");
      return false;
    }
    const exposure = round.myBets.reduce((total, bet) => total + BigInt(bet.amount), 0n);
    if (exposure + betAmount > BigInt(DEMO_TEEN_PATTI.max_round_bet)) {
      showToast("error", "Round limit reached.");
      return false;
    }
    if (readDemoBalance() < betAmount) {
      showToast("error", "Not enough coins for this chip.");
      return false;
    }
    const deck = decks().find((item) => item.id === option.id);
    if (!deck) {
      showToast("error", "This hand is not available for the current round.");
      return false;
    }

    onSubmitted?.();
    writeDemoBalance(readDemoBalance() - betAmount);
    walletVersionRef.current += 1;
    const acceptedAt = new Date().toISOString();
    round.betCount += 1;
    round.myBets.push({
      id: `demo-bet-${round.id}-${round.myBets.length + 1}`,
      round_id: round.id,
      client_request_id: `demo-${round.betCount}`,
      amount: betAmount.toString(),
      accepted_at: acceptedAt,
      option: deck,
      settlement: null,
    });
    addAggregate(round, DEMO_PLAYER, deck.id, betAmount, acceptedAt);
    publish();
    showToast("success", `${amount} coins placed on ${deck.name}`);
    return true;
  }, [publish]);

  const recover = useCallback(async () => {
    publish();
  }, [publish]);

  const roundBetTotal = useMemo(() => {
    const roundId = snapshot?.round?.id;
    return snapshot?.my_bets.reduce(
      (sum, bet) => (bet.round_id === roundId ? sum + BigInt(bet.amount) : sum),
      0n,
    ).toString() ?? "0";
  }, [snapshot]);

  const optionBetTotals = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const bet of snapshot?.my_bets ?? []) {
      if (bet.round_id !== snapshot?.round?.id) continue;
      totals.set(bet.option.id, (totals.get(bet.option.id) ?? 0n) + BigInt(bet.amount));
    }
    return totals;
  }, [snapshot]);

  const optionPotTotals = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const row of snapshot?.round?.option_pot_totals ?? []) {
      totals.set(row.option_id, BigInt(row.total_amount));
    }
    return totals;
  }, [snapshot]);

  const bettorsByOption = useMemo(() => {
    const grouped = new Map<string, PublicBetAggregate[]>();
    for (const bettor of snapshot?.round?.bettors ?? []) {
      const list = grouped.get(bettor.option_id) ?? [];
      list.push(bettor);
      grouped.set(bettor.option_id, list);
    }
    return grouped as ReadonlyMap<string, PublicBetAggregate[]>;
  }, [snapshot]);

  const playerCount = snapshot?.round?.player_count ?? 0;

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
