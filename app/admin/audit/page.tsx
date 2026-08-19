"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  FileClock,
  Filter,
  Fingerprint,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
} from "@/components/admin/admin-ui";
import { adminClient } from "@/lib/admin-client";
import { formatUtc, humanizeAdminValue } from "@/lib/admin-display";
import type { AdminAuditLog } from "@/types/admin";

type AuditFilters = {
  action: string;
  entityType: string;
  actorId: string;
  outcome: string;
  from: string;
  to: string;
  requestId: string;
  approvalId: string;
};

const EMPTY_FILTERS: AuditFilters = {
  action: "",
  entityType: "",
  actorId: "",
  outcome: "",
  from: "",
  to: "",
  requestId: "",
  approvalId: "",
};

function buildAuditQuery(filters: AuditFilters, page: number, limit: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entity_type", filters.entityType);
  if (filters.actorId) params.set("actor_id", filters.actorId);
  if (filters.outcome) params.set("outcome", filters.outcome);
  if (filters.requestId) params.set("request_id", filters.requestId);
  if (filters.approvalId) params.set("approval_request_id", filters.approvalId);
  if (filters.from) params.set("from", `${filters.from}T00:00:00.000Z`);
  if (filters.to) params.set("to", `${filters.to}T23:59:59.999Z`);
  return `?${params.toString()}`;
}

function primitive(value: unknown): ReactNode {
  if (value === null || value === undefined) return <span className="admin-audit-null">Not recorded</span>;
  if (typeof value === "boolean") return <StatusPill status={value ? "true" : "false"} />;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return String(value);
  return "Unsupported value";
}

function SnapshotTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || typeof value !== "object") return <>{primitive(value)}</>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="admin-audit-null">Empty list</span>;
    return (
      <ol className="admin-audit-array">
        {value.map((item, index) => <li key={index}><SnapshotTree value={item} depth={depth + 1} /></li>)}
      </ol>
    );
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return <span className="admin-audit-null">Empty object</span>;
  return (
    <dl className={`admin-audit-snapshot-tree ${depth > 0 ? "is-nested" : ""}`}>
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{humanizeAdminValue(key)}</dt>
          <dd><SnapshotTree value={item} depth={depth + 1} /></dd>
        </div>
      ))}
    </dl>
  );
}

function EvidenceItem({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return <div><dt>{label}</dt><dd className={mono ? "admin-mono-cell" : ""}>{value || "—"}</dd></div>;
}

function AuditDetailDialog({ row, onClose }: { row: AdminAuditLog | null; onClose: () => void }) {
  return (
    <Dialog.Root open={Boolean(row)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content className="admin-dialog admin-audit-dialog">
          <Dialog.Close className="admin-dialog__close" aria-label="Close audit detail"><X /></Dialog.Close>
          <Dialog.Title>Audit evidence</Dialog.Title>
          <Dialog.Description>
            A read-only rendering of actor, request correlation, and stored before/after snapshots. No export is available from this console.
          </Dialog.Description>
          {row && (
            <div className="admin-audit-dialog__body">
              <div className="admin-audit-dialog__hero">
                <div><span className="admin-eyebrow">Action</span><strong>{humanizeAdminValue(row.action)}</strong><small className="admin-mono-cell">{row.id}</small></div>
                <StatusPill status={row.outcome || "recorded"} />
              </div>
              <dl className="admin-audit-evidence-grid">
                <EvidenceItem label="Recorded (UTC)" value={formatUtc(row.created_at)} />
                <EvidenceItem label="Actor type" value={humanizeAdminValue(row.actor_type)} />
                <EvidenceItem label="Actor ID" value={row.actor_id || "System"} mono />
                <EvidenceItem label="Actor role" value={row.actor_role ? humanizeAdminValue(row.actor_role) : "Not recorded"} />
                <EvidenceItem label="Entity type" value={humanizeAdminValue(row.entity_type)} />
                <EvidenceItem label="Entity ID" value={row.entity_id || "Not recorded"} mono />
                <EvidenceItem label="Request ID" value={row.request_id || "Not recorded"} mono />
                <EvidenceItem label="Approval request" value={row.approval_request_id || "Not linked"} mono />
                <EvidenceItem label="Source IP" value={row.ip_address || "Not recorded"} mono />
                <EvidenceItem label="Admin user ID" value={row.admin_user_id || "Not recorded"} mono />
              </dl>
              <div className="admin-audit-user-agent">
                <span>User agent</span>
                <p>{row.user_agent || "Not recorded"}</p>
              </div>
              <div className="admin-audit-snapshot-grid">
                <section>
                  <header><ArrowLeft /><div><span className="admin-eyebrow">Before</span><h3>Previous values</h3></div></header>
                  <SnapshotTree value={row.old_values} />
                </section>
                <section>
                  <header><ArrowRight /><div><span className="admin-eyebrow">After</span><h3>New values</h3></div></header>
                  <SnapshotTree value={row.new_values} />
                </section>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function AdminAuditPage() {
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);
  const queryString = buildAuditQuery(filters, page, limit);
  const query = useQuery({
    queryKey: ["admin", "audit", filters, page, limit],
    queryFn: () => adminClient.auditLogsPaged(queryString),
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta ?? { page, limit, total: 0 };
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);
  const hasFilters = Object.values(filters).some(Boolean);

  function updateFilter(key: keyof AuditFilters, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    ) as AuditFilters);
  }

  function resetFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Governance / immutable evidence"
        title="Audit log"
        description="Trace sensitive configuration, runtime, wallet, authentication, and approval actions using server-side correlation filters. All timestamps are UTC."
        action={
          <button className="admin-secondary-button" type="button" disabled={query.isFetching} onClick={() => query.refetch()}>
            <RefreshCw className={query.isFetching ? "admin-spin" : ""} /> Refresh
          </button>
        }
      />

      <form className="admin-form-section admin-audit-filters" onSubmit={applyFilters}>
        <div className="admin-form-section__heading">
          <div>
            <span className="admin-eyebrow">Server filters</span>
            <h2>Correlate an audited action</h2>
            <p>Action, entity, actor, request, and approval identifiers are exact matches.</p>
          </div>
          <Filter />
        </div>
        <div className="admin-audit-filter-grid">
          <label>Action<input value={draft.action} onChange={(event) => updateFilter("action", event.target.value)} placeholder="wallet.admin_adjusted" maxLength={120} /></label>
          <label>Entity type<input value={draft.entityType} onChange={(event) => updateFilter("entityType", event.target.value)} placeholder="wallet" maxLength={120} /></label>
          <label>Actor ID<input value={draft.actorId} onChange={(event) => updateFilter("actorId", event.target.value)} placeholder="Exact actor ID" maxLength={128} /></label>
          <label>
            Outcome
            <select value={draft.outcome} onChange={(event) => updateFilter("outcome", event.target.value)}>
              <option value="">All outcomes</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label>From (UTC)<input type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => updateFilter("from", event.target.value)} /></label>
          <label>To (UTC)<input type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => updateFilter("to", event.target.value)} /></label>
          <label>Request ID<input value={draft.requestId} onChange={(event) => updateFilter("requestId", event.target.value)} placeholder="X-Request-Id" maxLength={128} /></label>
          <label>Approval request ID<input value={draft.approvalId} onChange={(event) => updateFilter("approvalId", event.target.value)} placeholder="Exact approval ID" maxLength={128} /></label>
          <label>
            Rows per page
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}>
              {[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <div className="admin-round-filter-actions">
            <button className="admin-primary-button" type="submit"><Search /> Apply filters</button>
            <button className="admin-secondary-button" type="button" onClick={resetFilters}><RotateCcw /> Reset</button>
          </div>
        </div>
      </form>

      {query.isLoading ? (
        <LoadingState label="Loading audit evidence…" />
      ) : query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : rows.length ? (
        <article className={`admin-panel admin-table-panel ${query.isFetching ? "is-refreshing" : ""}`}>
          <div className="admin-table-toolbar">
            <div><strong>{meta.total.toLocaleString()} audit records</strong><span>Showing {first.toLocaleString()}–{last.toLocaleString()}</span></div>
            {hasFilters && <span className="admin-filter-active"><Filter /> Filtered</span>}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table admin-audit-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>Outcome</th>
                  <th>Correlation</th>
                  <th>Recorded (UTC)</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{humanizeAdminValue(row.action)}</strong><span className="admin-table-sub admin-mono-cell">{row.id}</span></td>
                    <td><strong>{humanizeAdminValue(row.entity_type)}</strong><span className="admin-table-sub admin-mono-cell">{row.entity_id || "No entity ID"}</span></td>
                    <td><strong>{row.actor_id || "System"}</strong><span className="admin-table-sub">{row.actor_role ? humanizeAdminValue(row.actor_role) : humanizeAdminValue(row.actor_type)}</span></td>
                    <td><StatusPill status={row.outcome || "recorded"} /></td>
                    <td>
                      <span className="admin-audit-correlation"><Fingerprint /> <span className="admin-mono-cell">{row.request_id || "No request ID"}</span></span>
                      <span className="admin-table-sub admin-mono-cell">Approval: {row.approval_request_id || "not linked"}</span>
                    </td>
                    <td>{formatUtc(row.created_at)}</td>
                    <td><button className="admin-table-link admin-audit-view" type="button" onClick={() => setSelected(row)}><Eye /> Inspect</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>Page {meta.page.toLocaleString()} of {pages.toLocaleString()}</span>
            <div>
              <button className="admin-secondary-button" type="button" disabled={meta.page <= 1 || query.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}><ArrowLeft /> Previous</button>
              <button className="admin-secondary-button" type="button" disabled={meta.page >= pages || query.isFetching} onClick={() => setPage((current) => current + 1)}>Next <ArrowRight /></button>
            </div>
          </div>
        </article>
      ) : (
        <section className="admin-empty-page admin-empty-page--compact">
          <div className="admin-empty-page__icon"><FileClock /></div>
          <h2>{hasFilters ? "No audit records match" : "No audit records returned"}</h2>
          <p>{hasFilters ? "Reset or broaden the server filters. Identifier fields require exact values." : "Audited control-plane activity will appear here."}</p>
          {hasFilters && <button className="admin-secondary-button" type="button" onClick={resetFilters}><RotateCcw /> Clear filters</button>}
        </section>
      )}

      <div className="admin-audit-retention-note"><ShieldCheck /><span><strong>Read-only evidence</strong>Snapshots are rendered for investigation only. Retention and deletion remain controlled by backend policy.</span></div>
      <AuditDetailDialog row={selected} onClose={() => setSelected(null)} />
    </>
  );
}
