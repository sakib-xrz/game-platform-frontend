"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FileClock,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { ErrorState, LoadingState, PageHeader, StatusPill } from "@/components/admin/admin-ui";
import { formatUtc } from "@/lib/admin-display";
import { adminClient } from "@/lib/admin-client";

const ROUND_STATUSES = [
  "created",
  "betting_open",
  "betting_locked",
  "result_ready",
  "drawing",
  "result_revealed",
  "settling",
  "settled",
  "closed",
  "cancelled",
] as const;

type RoundFilters = {
  roundNumber: string;
  status: string;
  from: string;
  to: string;
  configVersion: string;
  winner: string;
};

const EMPTY_FILTERS: RoundFilters = {
  roundNumber: "",
  status: "",
  from: "",
  to: "",
  configVersion: "",
  winner: "",
};

function createRoundQuery(filters: RoundFilters, page: number, limit: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.roundNumber) params.set("round_number", filters.roundNumber);
  if (filters.status) params.set("status", filters.status);
  if (filters.configVersion) params.set("config_version", filters.configVersion);
  if (filters.winner) params.set("winner", filters.winner);
  if (filters.from) params.set("from", `${filters.from}T00:00:00.000Z`);
  if (filters.to) params.set("to", `${filters.to}T23:59:59.999Z`);
  return `?${params.toString()}`;
}

export default function AdminRoundsPage() {
  const [draft, setDraft] = useState<RoundFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<RoundFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const queryString = createRoundQuery(filters, page, limit);
  const query = useQuery({
    queryKey: ["admin", "rounds", filters, page, limit],
    queryFn: () => adminClient.rounds(queryString),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, limit, total: 0 };
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const firstRow = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const lastRow = Math.min(meta.page * meta.limit, meta.total);
  const hasFilters = Object.values(filters).some(Boolean);

  function updateFilter(key: keyof RoundFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({
      ...draft,
      roundNumber: draft.roundNumber.trim(),
      configVersion: draft.configVersion.trim(),
      winner: draft.winner.trim(),
    });
  }

  function resetFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations / history"
        title="Round history"
        description="Filter authoritative round history on the server, then inspect lifecycle, exposure, settlements, and result integrity. All timestamps are shown in UTC."
        action={
          <button
            className="admin-secondary-button"
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? "admin-spin" : ""} />
            Refresh
          </button>
        }
      />

      <form className="admin-form-section admin-round-filters" onSubmit={applyFilters}>
        <div className="admin-form-section__heading">
          <div>
            <span className="admin-eyebrow">Server filters</span>
            <h2>Find an exact investigation set</h2>
            <p>Winner matches an option code exactly or an option name partially.</p>
          </div>
          <Filter aria-hidden="true" />
        </div>
        <div className="admin-round-filter-grid">
          <label>
            Round number
            <input
              inputMode="numeric"
              min="1"
              pattern="[1-9][0-9]*"
              placeholder="e.g. 1289"
              type="number"
              value={draft.roundNumber}
              onChange={(event) => updateFilter("roundNumber", event.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All statuses</option>
              {ROUND_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label>
            Created from (UTC)
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(event) => updateFilter("from", event.target.value)}
            />
          </label>
          <label>
            Created to (UTC)
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(event) => updateFilter("to", event.target.value)}
            />
          </label>
          <label>
            Config version
            <input
              inputMode="numeric"
              min="1"
              placeholder="e.g. 12"
              type="number"
              value={draft.configVersion}
              onChange={(event) => updateFilter("configVersion", event.target.value)}
            />
          </label>
          <label>
            Winning option
            <input
              maxLength={50}
              placeholder="Code or name"
              value={draft.winner}
              onChange={(event) => updateFilter("winner", event.target.value)}
            />
          </label>
          <label>
            Rows per page
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="admin-round-filter-actions">
            <button className="admin-primary-button" type="submit"><Search /> Apply filters</button>
            <button className="admin-secondary-button" type="button" onClick={resetFilters}><RotateCcw /> Reset</button>
          </div>
        </div>
      </form>

      {query.isLoading ? (
        <LoadingState label="Loading round history…" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : rows.length ? (
        <article className={`admin-panel admin-table-panel ${query.isFetching ? "is-refreshing" : ""}`}>
          <div className="admin-table-toolbar">
            <div>
              <strong>{meta.total.toLocaleString()} rounds</strong>
              <span>Showing {firstRow.toLocaleString()}–{lastRow.toLocaleString()}</span>
            </div>
            {hasFilters && <span className="admin-filter-active"><Filter /> Filtered</span>}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Status</th>
                  <th>Config</th>
                  <th>Winning option</th>
                  <th>Processing</th>
                  <th>Created (UTC)</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((round) => (
                  <tr key={round.id}>
                    <td>
                      <strong>#{round.round_number}</strong>
                      <span className="admin-table-sub admin-mono-cell">{round.id}</span>
                    </td>
                    <td><StatusPill status={round.status} /></td>
                    <td>
                      <strong>v{round.config_version.version}</strong>
                      <span className="admin-table-sub">Frozen for this round</span>
                    </td>
                    <td>
                      <strong>{round.result?.winning_option.name || "Pending reveal"}</strong>
                      <span className="admin-table-sub">{round.result?.winning_option.code || "No result recorded"}</span>
                    </td>
                    <td>
                      <strong>{round._count.bets.toLocaleString()} bets</strong>
                      <span className="admin-table-sub">
                        {round._count.settlements.toLocaleString()} settled · {round._count.payouts.toLocaleString()} payouts · {round._count.refunds.toLocaleString()} refunds
                      </span>
                    </td>
                    <td>{formatUtc(round.created_at)}</td>
                    <td>
                      <Link className="admin-table-link" href={`/admin/rounds/${round.id}`}>
                        Inspect <ArrowRight />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>Page {meta.page.toLocaleString()} of {pages.toLocaleString()}</span>
            <div>
              <button
                className="admin-secondary-button"
                type="button"
                disabled={meta.page <= 1 || query.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ArrowLeft /> Previous
              </button>
              <button
                className="admin-secondary-button"
                type="button"
                disabled={meta.page >= pages || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next <ArrowRight />
              </button>
            </div>
          </div>
        </article>
      ) : (
        <section className="admin-empty-page">
          <div className="admin-empty-page__icon"><FileClock /></div>
          <h2>{hasFilters ? "No rounds match these filters" : "No rounds have been created"}</h2>
          <p>
            {hasFilters
              ? "Broaden or reset the filters. The search is applied by the operations API, not just this table."
              : "Rounds will appear here when the Greedy worker creates authoritative history."}
          </p>
          {hasFilters ? (
            <button className="admin-secondary-button" type="button" onClick={resetFilters}><RotateCcw /> Clear filters</button>
          ) : (
            <Link href="/admin/greedy" className="admin-secondary-button">Live operations <ArrowRight /></Link>
          )}
        </section>
      )}
    </>
  );
}
