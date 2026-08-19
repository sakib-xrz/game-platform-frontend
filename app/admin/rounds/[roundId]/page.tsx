"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileClock,
  Filter,
  Fingerprint,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusPill,
} from "@/components/admin/admin-ui";
import { adminClient } from "@/lib/admin-client";
import { formatAdminAmount, formatUtc } from "@/lib/admin-display";

type BetFilters = { userId: string; optionId: string };

const EMPTY_BET_FILTERS: BetFilters = { userId: "", optionId: "" };

function grossResult(accepted: string, refunded: string, payout: string) {
  try {
    return formatAdminAmount(BigInt(accepted) - BigInt(refunded) - BigInt(payout));
  } catch {
    return "—";
  }
}

function buildBetQuery(filters: BetFilters, page: number, limit: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.userId) params.set("user_id", filters.userId);
  if (filters.optionId) params.set("option_id", filters.optionId);
  return `?${params.toString()}`;
}

export default function RoundDetailPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const [draftBetFilters, setDraftBetFilters] = useState<BetFilters>(EMPTY_BET_FILTERS);
  const [betFilters, setBetFilters] = useState<BetFilters>(EMPTY_BET_FILTERS);
  const [betPage, setBetPage] = useState(1);
  const [betLimit, setBetLimit] = useState(20);

  const detailQuery = useQuery({
    queryKey: ["admin", "round", roundId],
    queryFn: () => adminClient.round(roundId),
    staleTime: 5_000,
  });
  const betsQuery = useQuery({
    queryKey: ["admin", "round", roundId, "bets", betFilters, betPage, betLimit],
    queryFn: () => adminClient.roundBets(roundId, buildBetQuery(betFilters, betPage, betLimit)),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
  const verificationQuery = useQuery({
    queryKey: ["admin", "round", roundId, "verification"],
    queryFn: () => adminClient.verifyRound(roundId),
    enabled: false,
    retry: false,
  });

  if (detailQuery.isLoading) return <LoadingState label="Loading authoritative round record…" />;
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ErrorState
        message={(detailQuery.error as Error)?.message || "Round unavailable"}
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const { round, financials, outcomes } = detailQuery.data;
  const bets = betsQuery.data?.data ?? [];
  const betMeta = betsQuery.data?.meta ?? { page: betPage, limit: betLimit, total: 0 };
  const betPages = Math.max(1, Math.ceil(betMeta.total / betMeta.limit));
  const betFirst = betMeta.total === 0 ? 0 : (betMeta.page - 1) * betMeta.limit + 1;
  const betLast = Math.min(betMeta.page * betMeta.limit, betMeta.total);
  const hasBetFilters = Boolean(betFilters.userId || betFilters.optionId);

  const lifecycle = [
    ["Created", round.created_at],
    ["Betting started", round.betting_started_at],
    ["Betting ended", round.betting_ends_at],
    ["Locked", round.locked_at],
    ["Result generated", round.result_generated_at],
    ["Drawing started", round.drawing_started_at],
    ["Result revealed", round.result_reveal_at],
    ["Settlement started", round.settlement_started_at],
    ["Settled", round.settled_at],
    ["Closed", round.closed_at],
    ["Cancelled", round.cancelled_at],
  ] as const;

  function applyBetFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBetPage(1);
    setBetFilters({
      userId: draftBetFilters.userId.trim(),
      optionId: draftBetFilters.optionId,
    });
  }

  function resetBetFilters() {
    setDraftBetFilters(EMPTY_BET_FILTERS);
    setBetFilters(EMPTY_BET_FILTERS);
    setBetPage(1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations / round investigation"
        title={`Round #${round.round_number}`}
        description={`Immutable round record · Config v${round.config_version.version} · Times are normalized to UTC.`}
        action={
          <div className="admin-button-row">
            <button
              className="admin-secondary-button"
              type="button"
              disabled={detailQuery.isFetching}
              onClick={() => detailQuery.refetch()}
            >
              <RefreshCw className={detailQuery.isFetching ? "admin-spin" : ""} /> Refresh
            </button>
            <Link href="/admin/rounds" className="admin-secondary-button"><ArrowLeft /> History</Link>
          </div>
        }
      />

      <section className="admin-round-identity">
        <div>
          <span className="admin-eyebrow">Lifecycle state</span>
          <div className="admin-round-identity__status">
            <StatusPill status={round.status} />
            <span className="admin-mono-cell">{round.id}</span>
          </div>
        </div>
        <div>
          <span>Configuration snapshot</span>
          <strong>Version {round.config_version.version}</strong>
        </div>
        <div>
          <span>Last record update</span>
          <strong>{formatUtc(round.updated_at)}</strong>
        </div>
      </section>

      <div className="admin-metric-grid admin-round-metrics">
        <MetricCard
          label="Accepted stake"
          value={formatAdminAmount(financials.total_bet_amount)}
          hint={`${financials.bet_count.toLocaleString()} accepted bets`}
        />
        <MetricCard
          label="Payouts"
          value={formatAdminAmount(financials.total_payout)}
          hint={`${financials.payout_users.toLocaleString()} paid players · ${formatAdminAmount(financials.total_winning_stake)} winning stake`}
          tone="is-amber"
        />
        <MetricCard
          label="Refunded stake"
          value={formatAdminAmount(financials.total_refunded)}
          hint={`${financials.refund_users.toLocaleString()} refunded players`}
        />
        <MetricCard
          label="Gross result"
          value={grossResult(financials.total_bet_amount, financials.total_refunded, financials.total_payout)}
          hint="Accepted − refunded − payouts"
          tone="is-green"
        />
      </div>

      <div className="admin-round-investigation-grid">
        <section className="admin-panel">
          <div className="admin-panel__top">
            <div>
              <span className="admin-eyebrow">State transitions</span>
              <h2>Lifecycle timeline</h2>
            </div>
            <Clock3 />
          </div>
          <ol className="admin-round-timeline">
            {lifecycle.map(([label, timestamp]) => (
              <li className={timestamp ? "is-complete" : ""} key={label}>
                <span aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <small>{formatUtc(timestamp)}</small>
                </div>
              </li>
            ))}
          </ol>
          {round.cancellation_reason && (
            <div className="admin-callout admin-callout--warning admin-round-cancellation">
              <Ban />
              <div><strong>Cancellation reason</strong><p>{round.cancellation_reason}</p></div>
            </div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel__top">
            <div>
              <span className="admin-eyebrow">Immutable result</span>
              <h2>Winner & integrity</h2>
            </div>
            <Fingerprint />
          </div>
          {round.result ? (
            <>
              <div className="admin-winning-option">
                <span>{round.result.winning_option.code.slice(0, 2).toUpperCase()}</span>
                <div>
                  <small>Winning option</small>
                  <strong>{round.result.winning_option.name}</strong>
                  <em>{round.result.winning_option.code}</em>
                </div>
              </div>
              <dl className="admin-detail-list">
                <div><dt>Algorithm</dt><dd>{round.result.algorithm_version}</dd></div>
                <div><dt>Generated</dt><dd>{formatUtc(round.result.generated_at)}</dd></div>
                <div><dt>Revealed</dt><dd>{formatUtc(round.result.revealed_at)}</dd></div>
                <div><dt>Result ID</dt><dd className="admin-mono" title={round.result.id}>{round.result.id}</dd></div>
                <div><dt>Audit fingerprint</dt><dd className="admin-mono" title={round.result.audit_hash}>{round.result.audit_hash}</dd></div>
              </dl>
              <button
                className="admin-primary-button admin-verify-button"
                type="button"
                disabled={verificationQuery.isFetching}
                onClick={() => verificationQuery.refetch()}
              >
                {verificationQuery.isFetching ? <Loader2 className="admin-spin" /> : <BadgeCheck />}
                Verify immutable result
              </button>
              {verificationQuery.isError && (
                <div className="admin-verification-result is-failed">
                  <ShieldAlert />
                  <div><strong>Verification could not complete</strong><p>{(verificationQuery.error as Error).message}</p></div>
                </div>
              )}
              {verificationQuery.data && (
                <div className={`admin-verification-result ${verificationQuery.data.verified ? "is-verified" : "is-failed"}`}>
                  {verificationQuery.data.verified ? <CheckCircle2 /> : <XCircle />}
                  <div>
                    <strong>{verificationQuery.data.verified ? "Result integrity verified" : "Integrity mismatch detected"}</strong>
                    <p>
                      Recomputed for {verificationQuery.data.winning_option.name} with {verificationQuery.data.algorithm_version}.
                    </p>
                    {verificationQuery.data.expected_hash && (
                      <small className="admin-mono-cell">Expected {verificationQuery.data.expected_hash}</small>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="admin-empty admin-round-empty">
              <FileClock />
              <p>No immutable result exists for this round yet.</p>
              <small>Verification becomes available after result generation.</small>
            </div>
          )}
        </section>
      </div>

      <div className="admin-round-investigation-grid admin-round-investigation-grid--lower">
        <section className="admin-panel">
          <div className="admin-panel__top">
            <div>
              <span className="admin-eyebrow">Settlement coverage</span>
              <h2>Outcome distribution</h2>
            </div>
            <ReceiptText />
          </div>
          {outcomes.length ? (
            <div className="admin-outcome-list">
              {outcomes.map((outcome) => (
                <div key={outcome.outcome}>
                  <StatusPill status={outcome.outcome} />
                  <strong>{outcome._count._all.toLocaleString()} bets</strong>
                  <span>{formatAdminAmount(outcome._sum.payout_amount)} payout</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty admin-round-empty"><p>No settlement outcomes have been written.</p></div>
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-panel__top">
            <div>
              <span className="admin-eyebrow">Persistence coverage</span>
              <h2>Round records</h2>
            </div>
            <CircleDollarSign />
          </div>
          <div className="admin-round-counts">
            <div><ReceiptText /><span>Bets</span><strong>{round._count.bets.toLocaleString()}</strong></div>
            <div><CheckCircle2 /><span>Settlements</span><strong>{round._count.settlements.toLocaleString()}</strong></div>
            <div><Users /><span>User payouts</span><strong>{round._count.payouts.toLocaleString()}</strong></div>
            <div><RotateCcw /><span>User refunds</span><strong>{round._count.refunds.toLocaleString()}</strong></div>
          </div>
          <p className="admin-panel-note">Payout and refund values above are authoritative aggregate records. Per-bet disposition appears in the ledger below.</p>
        </section>
      </div>

      <section className="admin-form-section admin-round-bets-section">
        <div className="admin-form-section__heading">
          <div>
            <span className="admin-eyebrow">Paged ledger</span>
            <h2>Accepted bets & settlements</h2>
            <p>Filter this round by an exact player ID or one frozen option from config v{round.config_version.version}.</p>
          </div>
          <Filter />
        </div>
        <form className="admin-bet-filter-row" onSubmit={applyBetFilters}>
          <label>
            Player ID
            <input
              maxLength={128}
              placeholder="Exact user ID"
              value={draftBetFilters.userId}
              onChange={(event) => setDraftBetFilters((current) => ({ ...current, userId: event.target.value }))}
            />
          </label>
          <label>
            Option
            <select
              value={draftBetFilters.optionId}
              onChange={(event) => setDraftBetFilters((current) => ({ ...current, optionId: event.target.value }))}
            >
              <option value="">All options</option>
              {round.config_version.options.map((option) => (
                option.id && <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
              ))}
            </select>
          </label>
          <label>
            Rows
            <select
              value={betLimit}
              onChange={(event) => {
                setBetLimit(Number(event.target.value));
                setBetPage(1);
              }}
            >
              {[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="admin-round-filter-actions">
            <button className="admin-primary-button" type="submit"><Search /> Apply</button>
            <button className="admin-secondary-button" type="button" onClick={resetBetFilters}><RotateCcw /> Reset</button>
          </div>
        </form>
      </section>

      {betsQuery.isError ? (
        <ErrorState message={(betsQuery.error as Error).message} onRetry={() => betsQuery.refetch()} />
      ) : betsQuery.isLoading ? (
        <LoadingState label="Loading bet ledger…" />
      ) : bets.length ? (
        <article className={`admin-panel admin-table-panel ${betsQuery.isFetching ? "is-refreshing" : ""}`}>
          <div className="admin-table-toolbar">
            <div>
              <strong>{betMeta.total.toLocaleString()} matching bets</strong>
              <span>Showing {betFirst.toLocaleString()}–{betLast.toLocaleString()}</span>
            </div>
            {hasBetFilters && <span className="admin-filter-active"><Filter /> Filtered</span>}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Accepted (UTC)</th>
                  <th>Player</th>
                  <th>Option</th>
                  <th>Stake</th>
                  <th>Frozen payout</th>
                  <th>Settlement</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={bet.id}>
                    <td>
                      {formatUtc(bet.accepted_at)}
                      <span className="admin-table-sub admin-mono-cell">{bet.id}</span>
                    </td>
                    <td>
                      <Link className="admin-table-link" href={`/admin/players?user_id=${encodeURIComponent(bet.user_id)}`}>
                        {bet.user_id} <ArrowRight />
                      </Link>
                    </td>
                    <td><strong>{bet.option.name}</strong><span className="admin-table-sub">{bet.option.code}</span></td>
                    <td><strong>{formatAdminAmount(bet.amount)}</strong></td>
                    <td>{bet.payout_numerator}:{bet.payout_denominator}</td>
                    <td>
                      {bet.settlement ? (
                        <><StatusPill status={bet.settlement.outcome} /><span className="admin-table-sub">{formatUtc(bet.settlement.settled_at)}</span></>
                      ) : (
                        <StatusPill status="pending" />
                      )}
                    </td>
                    <td><strong>{bet.settlement ? formatAdminAmount(bet.settlement.payout_amount) : "—"}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>Page {betMeta.page.toLocaleString()} of {betPages.toLocaleString()}</span>
            <div>
              <button
                className="admin-secondary-button"
                type="button"
                disabled={betMeta.page <= 1 || betsQuery.isFetching}
                onClick={() => setBetPage((current) => Math.max(1, current - 1))}
              >
                <ArrowLeft /> Previous
              </button>
              <button
                className="admin-secondary-button"
                type="button"
                disabled={betMeta.page >= betPages || betsQuery.isFetching}
                onClick={() => setBetPage((current) => current + 1)}
              >
                Next <ArrowRight />
              </button>
            </div>
          </div>
        </article>
      ) : (
        <section className="admin-empty-page admin-empty-page--compact">
          <div className="admin-empty-page__icon"><ReceiptText /></div>
          <h2>{hasBetFilters ? "No bets match these filters" : "No bets were accepted"}</h2>
          <p>{hasBetFilters ? "Reset the player or option filter to inspect the full round ledger." : "This round has no accepted bet records."}</p>
          {hasBetFilters && <button className="admin-secondary-button" type="button" onClick={resetBetFilters}><RotateCcw /> Clear filters</button>}
        </section>
      )}
    </>
  );
}
