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

export type PublicDeck = {
  id: string;
  code: string;
  name: string;
  image_url: string | null;
  display_order: number;
  is_enabled?: boolean;
};

export type WinningOption = Pick<
  PublicDeck,
  "id" | "code" | "name" | "image_url"
>;

export type PlayerIdentity = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

/** One server-aggregated row per option and player for the active round. */
export type PublicBetAggregate = PlayerIdentity & {
  round_id: string;
  option_id: string;
  total_amount: string;
  bet_count: number;
  first_bet_at: string;
  last_bet_at: string;
};

export type PreviewCard = {
  option_id: string;
  card: string;
};

export type ChipValue = {
  id: string;
  amount: string;
  display_order: number;
  is_enabled?: boolean;
};

export type TeenPattiConfig = {
  id: string;
  version: number;
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  rake_bps: number;
  options: PublicDeck[];
  chip_values: ChipValue[];
};

export type DealtHand = {
  option_id: string;
  option_code: string;
  cards: [string, string, string];
  category: string;
  rank_key: string;
};

export type RoundResult = {
  id?: string;
  round_id: string;
  algorithm_version?: string;
  generated_at?: string;
  revealed_at: string | null;
  deal_attempt_count?: number;
  hands?: DealtHand[] | null;
  winning_option: PublicDeck;
};

export type OptionPotTotal = {
  option_id: string;
  total_amount: string;
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
  options: PublicDeck[];
  chip_values: ChipValue[];
  rake_bps?: number;
  /** Number of accepted tap-level bets in this round across every player and option. */
  round_bet_count: number;
  option_pot_totals?: OptionPotTotal[];
  bettors: PublicBetAggregate[];
  player_count: number;
  preview_cards: PreviewCard[];
  result_commitment: string | null;
  result: RoundResult | null;
};

export type Wallet = {
  id: string;
  user_id: string;
  currency_id: string;
  balance: string;
  version: number;
  created_at: string;
  updated_at: string;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string | null;
    is_active: boolean;
  };
};

export type PlayerBet = {
  id: string;
  round_id: string;
  client_request_id: string;
  amount: string;
  accepted_at: string;
  option: PublicDeck;
  settlement: {
    outcome: string;
    payout_amount: string;
    settled_at: string | null;
  } | null;
};

export type RecentRound = {
  id: string;
  round_number: string;
  status: RoundStatus;
  result_reveal_at: string | null;
  closed_at: string | null;
  total_bet_amount: string;
  total_payout_amount: string;
  result: RoundResult | null;
};

export type TeenPattiSnapshot = {
  server_time: string;
  game: { code: string; name: string; status: GameStatus };
  runtime: { status: RuntimeStatus; revision: string };
  active_config: TeenPattiConfig;
  round: SnapshotRound | null;
  player: PlayerIdentity;
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

export type PublicBetPlacedEvent = PlayerIdentity & {
  event_id: string;
  bet_id: string;
  round_id: string;
  option_id: string;
  amount: string;
  accepted_at: string;
  user_total_amount: string;
  option_total_amount: string;
  bet_count: number;
  first_bet_at: string;
  last_bet_at: string;
  player_count: number;
  round_bet_count: number;
};

export type RoundOpenedEvent = {
  event_id: string;
  round_id: string;
  round_number: string;
  betting_started_at: string;
  betting_ends_at: string;
  options: PublicDeck[];
  chip_values: ChipValue[];
  preview_cards: PreviewCard[];
  result_commitment: string;
  rake_bps: number;
};

export type RoundLockedEvent = {
  event_id: string;
  round_id: string;
  locked_at?: string;
};

export type RoundDrawingEvent = {
  event_id: string;
  round_id: string;
  drawing_started_at?: string;
  result_reveal_at?: string;
};

export type RoundResultEvent = {
  event_id: string;
  round_id: string;
  winning_option: WinningOption;
  hands?: DealtHand[];
  revealed_at: string;
};

export type WalletBalanceEvent = {
  event_id: string;
  wallet_id: string;
  balance: string;
  wallet_version: number;
  reason: string;
  round_id?: string;
  payout?: string;
  refund?: string;
};
