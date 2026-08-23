export type AdminRole = "super_admin" | "game_operator" | "finance_operator" | "support" | "auditor";

export type AdminIdentity = {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  status: "active" | "locked" | "disabled";
  force_password_change: boolean;
};

export type AdminSession = {
  authenticated: true;
  actorId: string;
  identity: AdminIdentity;
};

export type AdminRuntime = {
  id: string;
  game_id: string;
  current_round_id: string | null;
  active_config_version_id: string | null;
  status: "stopped" | "running" | "paused" | "degraded" | string;
  last_round_number: string;
  revision: string;
  updated_at: string;
  created_at: string;
  current_round: AdminRound | null;
  active_config_version: AdminConfigVersion | null;
};

export type AdminRound = {
  id: string;
  game_id: string;
  round_number: string;
  config_version_id: string;
  status: string;
  betting_started_at: string | null;
  betting_ends_at: string | null;
  locked_at: string | null;
  result_generated_at: string | null;
  drawing_started_at: string | null;
  result_reveal_at: string | null;
  settlement_started_at: string | null;
  settled_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminOption = {
  id?: string;
  config_version_id?: string;
  code: string;
  name: string;
  image_url: string | null;
  asset_id?: string | null;
  display_order: number;
  payout_numerator: string;
  payout_denominator: string;
  probability_weight: string;
  is_enabled: boolean;
};

export type AdminChipValue = {
  id?: string;
  config_version_id?: string;
  amount: string;
  display_order: number;
  is_enabled: boolean;
};

export type AdminConfigVersion = {
  id: string;
  game_id: string;
  version: number;
  status: "draft" | "review_pending" | "published" | "retired" | string;
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  retired_at: string | null;
  options: AdminOption[];
  chip_values: AdminChipValue[];
};

export type CreateAdminConfigInput = {
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  notes?: string;
  options: AdminOption[];
  chip_values: AdminChipValue[];
};

export type TeenPattiAdminOption = {
  id?: string;
  config_version_id?: string;
  code: string;
  name: string;
  image_url: string | null;
  asset_id?: string | null;
  display_order: number;
  is_enabled: boolean;
};

export type TeenPattiAdminConfigVersion = {
  id: string;
  game_id: string;
  version: number;
  status: "draft" | "review_pending" | "published" | "retired" | string;
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  rake_bps: number;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  retired_at: string | null;
  options: TeenPattiAdminOption[];
  chip_values: AdminChipValue[];
};

export type CreateTeenPattiAdminConfigInput = {
  betting_duration_ms: number;
  lock_duration_ms: number;
  drawing_duration_ms: number;
  result_duration_ms: number;
  min_bet: string;
  max_single_bet: string;
  max_round_bet: string;
  rake_bps: number;
  notes?: string;
  options: TeenPattiAdminOption[];
  chip_values: AdminChipValue[];
};

export type TeenPattiConfigValidationPreview = {
  valid: boolean;
  failures: Array<{ field: string; message: string }>;
  rake_bps: number;
  decks: string[];
};

export type AdminError = { message?: string; errors?: string[] };
export type AdminPaged<T> = T[];
export type AdminPageMeta = { page: number; limit: number; total: number };
export type AdminPagedResult<T> = { data: T[]; meta: AdminPageMeta };
export type AdminApprovalDecision = {
  id: string;
  request_id: string;
  admin_user_id: string;
  decision: "approve" | "reject" | string;
  reason: string | null;
  created_at: string;
};

export type AdminApproval = {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  payload_hash: string;
  requested_by_admin_id: string;
  status: "pending" | "approved" | "rejected" | "expired" | "applied" | string;
  required_approvals: number;
  idempotency_key: string;
  expires_at: string;
  applied_at: string | null;
  execution_error: string | null;
  created_at: string;
  updated_at: string;
  decisions: AdminApprovalDecision[];
};

export type AdminAuditLog = {
  id: string;
  actor_type: string;
  actor_id: string | null;
  admin_user_id: string | null;
  actor_role: AdminRole | null;
  outcome: string | null;
  approval_request_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
};

export type AdminRoundCounts = {
  bets: number;
  settlements: number;
  payouts: number;
  refunds: number;
};

export type AdminWinningOption = {
  id: string;
  code: string;
  name: string;
  image_url?: string | null;
};

export type AdminRoundResult = {
  id: string;
  algorithm_version: string;
  entropy_digest?: string;
  audit_hash: string;
  generated_at: string;
  revealed_at: string | null;
  winning_option: AdminWinningOption;
};

export type AdminRoundSummary = Omit<AdminRound, "game_id" | "config_version_id"> & {
  config_version: { id: string; version: number };
  result: AdminRoundResult | null;
  _count: AdminRoundCounts;
};

export type AdminRoundDetailRecord = AdminRound & {
  config_version: AdminConfigVersion;
  result: AdminRoundResult | null;
  _count: AdminRoundCounts;
};

export type AdminRoundFinancials = {
  bet_count: number;
  total_bet_amount: string;
  payout_users: number;
  total_payout: string;
  total_winning_stake: string;
  refund_users: number;
  total_refunded: string;
};

export type AdminRoundOutcome = {
  outcome: "win" | "loss" | "refunded" | string;
  _count: { _all: number };
  _sum: { payout_amount: string | null };
};

export type AdminRoundDetail = {
  round: AdminRoundDetailRecord;
  financials: AdminRoundFinancials;
  outcomes: AdminRoundOutcome[];
};

export type AdminRoundBet = {
  id: string;
  user_id: string;
  amount: string;
  accepted_at: string;
  client_request_id: string;
  payout_numerator: string;
  payout_denominator: string;
  option: AdminWinningOption;
  settlement: {
    outcome: "win" | "loss" | "refunded" | string;
    payout_amount: string;
    settled_at: string;
  } | null;
};

export type AdminRoundVerification = {
  verified: boolean;
  round_id: string;
  result_id: string;
  algorithm_version: string;
  generated_at: string;
  revealed_at: string | null;
  winning_option: Omit<AdminWinningOption, "image_url">;
  audit_hash?: string;
  expected_hash?: string;
};

export type AdminWalletLedger = {
  id: string;
  wallet_id: string;
  user_id: string;
  game_id: string | null;
  type: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  reference_type: string | null;
  reference_id: string | null;
  idempotency_key: string | null;
  metadata: unknown;
  created_at: string;
};

export type AdminPlayerBet = {
  id: string;
  round_id: string;
  amount: string;
  accepted_at: string;
  option: Omit<AdminWinningOption, "id">;
  settlement: AdminRoundBet["settlement"];
};

export type AdminPlayerSummary = {
  user_id: string;
  wallet: {
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
      created_at: string;
      updated_at: string;
    };
  };
  totals: {
    bet_count: number;
    total_bet_amount: string;
    total_payout: string;
    total_refunded: string;
  };
  ledger: AdminWalletLedger[];
  bets: AdminPlayerBet[];
};

export type AdminAsset = {
  id: string;
  object_key: string;
  content_type: string;
  byte_size: number;
  checksum_sha256: string;
  status: string;
  cdn_url: string | null;
};

export type AdminUserRecord = AdminIdentity & {
  failed_login_count: number;
  locked_until: string | null;
  password_changed_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSessionRecord = {
  id: string;
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

export type OpsAlert = {
  id: string;
  code: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  message: string;
  source: string;
  metadata?: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
};

export type WalletAdjustmentInput = {
  user_id: string;
  direction: "credit" | "debit";
  amount: string;
  ticket_reference: string;
  reason: string;
  approval_id?: string;
};

export type WalletAdjustmentResult = {
  status: "pending_approval" | "applied";
  approval_id?: string;
  expires_at?: string;
  wallet?: { id: string; balance: string; version: number };
  ledger?: AdminWalletLedger;
};

export type AdminWalletSearchItem = {
  id: string;
  user_id: string;
  balance: string;
  version: number;
  created_at: string;
  updated_at: string;
  currency: { code: string; name: string; symbol: string | null };
};

export type PlatformAppRecord = {
  id: string;
  app_name: string;
  package_name: string;
  sha_key: string;
  signing_secret_preview: string;
  has_rotated_signing_secret: boolean;
  signing_secret?: string;
  status: "active" | "disabled";
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePlatformAppInput = {
  app_name: string;
  package_name: string;
  sha_key: string;
  status?: "active" | "disabled";
};

export type UpdatePlatformAppInput = Partial<CreatePlatformAppInput>;
