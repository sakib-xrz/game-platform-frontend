export type GameStatus = "active" | "inactive" | "maintenance" | string;
export type RuntimeStatus = "running" | "stopped" | "paused" | string;

export type RoundStatus =
  | "betting_open"
  | "betting_locked"
  | "result_ready"
  | "drawing"
  | "result_revealed"
  | "settling"
  | "settled"
  | "closed"
  | "cancelled"
  | string;

export type PublicOption = {
  id: string;
  code: string;
  name: string;
  image_url: string | null;
  display_order: number;
  payout_numerator: string;
  payout_denominator: string;
  /** Player-facing label from the API, e.g. "8x". */
  payout_multiplier?: string;
  is_enabled?: boolean;
};

export type WinningOption = Pick<
  PublicOption,
  | "id"
  | "code"
  | "name"
  | "image_url"
  | "payout_numerator"
  | "payout_denominator"
  | "payout_multiplier"
>;

export type PlayerIdentity = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

/** One permanent, server-aggregated row per option and player. */
export type PublicBetAggregate = PlayerIdentity & {
  round_id: string;
  option_id: string;
  total_amount: string;
  bet_count: number;
  first_bet_at: string;
  last_bet_at: string;
};

export type TopWinner = PlayerIdentity & {
  rank: number;
  winning_stake: string;
  total_payout: string;
  bet_count: number;
  first_bet_at: string;
};

export type ChipValue = {
  id: string;
  amount: string;
  display_order: number;
  is_enabled?: boolean;
};

export type GreedyConfig = {
  id: string;
  version: number;
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  options: PublicOption[];
  chip_values: ChipValue[];
};

export type RoundResult = {
  id?: string;
  round_id: string;
  algorithm_version?: string;
  generated_at?: string;
  revealed_at: string | null;
  winning_option: PublicOption;
  /** Lucky 77 uses the exact revealed wheel segment for deterministic motion. */
  winning_slot_index?: number;
  top_winners: TopWinner[];
};

export type SnapshotRound = {
  id: string;
  config_version_id: string;
  round_number: string;
  status: RoundStatus;
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  betting_started_at: string | null;
  betting_ends_at: string | null;
  drawing_started_at: string | null;
  result_reveal_at: string | null;
  options: PublicOption[];
  chip_values: ChipValue[];
  bettors: PublicBetAggregate[];
  result: RoundResult | null;
};

export type WalletCurrency = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  is_active: boolean;
};

export type Wallet = {
  id: string;
  user_id: string;
  currency_id: string;
  balance: string;
  version: number;
  created_at: string;
  updated_at: string;
  currency: WalletCurrency;
};

export type BetSettlement = {
  outcome: string;
  payout_amount: string;
  settled_at: string | null;
};

export type PlayerBet = {
  id: string;
  round_id: string;
  amount: string;
  accepted_at: string;
  option: PublicOption;
  settlement: BetSettlement | null;
};

export type RecentRound = {
  id: string;
  round_number: string;
  status: RoundStatus;
  result_reveal_at: string | null;
  closed_at: string | null;
  result: RoundResult | null;
};

export type GreedySnapshot = {
  server_time: string;
  game: {
    code: string;
    name: string;
    status: GameStatus;
  };
  runtime: {
    status: RuntimeStatus;
    revision: string;
  };
  /** Present for fixed-layout wheel games such as Lucky 77. */
  slot_map?: string[];
  active_config: GreedyConfig;
  round: SnapshotRound | null;
  wallet: Wallet;
  my_bets: PlayerBet[];
  recent_history: RecentRound[];
};

export type BetRequest = {
  round_id: string;
  option_id: string;
  amount: string;
  client_request_id: string;
};

export type BetResponse = {
  bet_id: string;
  round_id: string;
  option_id: string;
  amount: string;
  client_request_id: string;
  wallet_balance: string;
  wallet_version: number;
  accepted_at: string;
};

export type BetAcceptedEvent = BetResponse & { event_id: string };

export type PublicBetPlacedEvent = {
  event_id: string;
  bet_id: string;
  round_id: string;
  option_id: string;
  amount: string;
  accepted_at: string;
  total_amount: string;
  bet_count: number;
  first_bet_at: string;
  last_bet_at: string;
  bettor: PlayerIdentity;
};

export type SocketEnvelope = { event_id?: string } & Record<string, unknown>;

export type RoundOpenedEvent = {
  event_id: string;
  round_id: string;
  round_number: string;
  betting_started_at: string;
  betting_ends_at: string;
  options: PublicOption[];
  chip_values: ChipValue[];
};

export type RoundLockedEvent = {
  event_id: string;
  round_id: string;
  locked_at: string;
};

export type RoundDrawingEvent = {
  event_id: string;
  round_id: string;
  drawing_started_at: string;
  result_reveal_at: string;
};

export type RoundResultEvent = {
  event_id: string;
  round_id: string;
  winning_option: WinningOption;
  winning_slot_index?: number;
  revealed_at: string;
  top_winners: TopWinner[];
};

export type WalletBalanceEvent = {
  event_id: string;
  wallet_id: string;
  balance: string;
  wallet_version: number;
  reason: "greedy_bet" | "greedy_win" | "greedy_refund" | "admin_adjustment" | string;
  round_id?: string;
  payout?: string;
  refund?: string;
};
