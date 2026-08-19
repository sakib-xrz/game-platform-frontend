"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bell, CheckCircle2, Database, RefreshCw, ServerCog, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AdminSelect, ErrorState, LoadingState, PageHeader, StatusPill } from "@/components/admin/admin-ui";
import { useAdminIdentity } from "@/components/admin/admin-gate";
import { useAdminHealth } from "@/hooks/use-admin";
import { adminClient } from "@/lib/admin-client";
import type { OpsAlert } from "@/types/admin";

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "—";
}

function dependencyStatus(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "healthy" in value) return (value as { healthy: boolean }).healthy ? "healthy" : "unhealthy";
  return value ? "healthy" : "unhealthy";
}

export default function AdminAlertsPage() {
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("open");
  const health = useAdminHealth();
  const alerts = useQuery({ queryKey: ["admin", "alerts", status], queryFn: () => adminClient.alerts(`?status=${status}&page=1&limit=50`), refetchInterval: 10_000, refetchIntervalInBackground: false });
  const acknowledge = useMutation({ mutationFn: adminClient.acknowledgeAlert, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] }) });
  const resolve = useMutation({ mutationFn: adminClient.resolveAlert, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] }) });
  if (health.isLoading || alerts.isLoading) return <LoadingState />;
  if (health.isError || alerts.isError) return <ErrorState message={(health.error || alerts.error as Error)?.message || "Operational health is unavailable"} onRetry={() => { void health.refetch(); void alerts.refetch(); }} />;
  const snapshot = (health.data || {}) as { database?: unknown; redis?: unknown; game?: Record<string, unknown> | null; worker?: Record<string, unknown>; outbox?: Record<string, number>; webhook?: Record<string, unknown> };
  const rows = (alerts.data || []) as OpsAlert[];
  const canManage = identity.role === "super_admin" || identity.role === "game_operator";
  return <><PageHeader eyebrow="System / reliability" title="Health & alerts" description="Readiness, worker leases, delivery backlog, and deduplicated incidents update every ten seconds while this tab is visible." action={<button className="admin-secondary-button" onClick={() => { void health.refetch(); void alerts.refetch(); }}><RefreshCw className={health.isFetching || alerts.isFetching ? "admin-spin" : ""} /> Refresh</button>} />
    <section className="admin-metric-grid"><article className="admin-metric-card"><Database /><span>Database</span><strong><StatusPill status={dependencyStatus(snapshot.database)} /></strong><small>Authoritative storage readiness</small></article><article className="admin-metric-card"><Activity /><span>Redis</span><strong><StatusPill status={dependencyStatus(snapshot.redis)} /></strong><small>Coordination and live state</small></article><article className="admin-metric-card"><ServerCog /><span>Worker lease</span><strong><StatusPill status={dependencyStatus(snapshot.worker)} /></strong><small>{snapshot.worker?.heartbeat_at ? `Heartbeat ${date(String(snapshot.worker.heartbeat_at))}` : "No heartbeat recorded"}</small></article><article className="admin-metric-card"><Bell /><span>Open alerts</span><strong>{rows.filter((row) => row.status === "open").length}</strong><small>{Object.entries(snapshot.outbox || {}).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Outbox has no queued rows"}</small></article></section>

    <section className="admin-grid-2"><article className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Runtime dependency detail</span><h2>Control-plane snapshot</h2></div><Activity /></div><dl className="admin-detail-list"><div><dt>Game availability</dt><dd><StatusPill status={String(snapshot.game?.status || "unknown")} /></dd></div><div><dt>Runtime</dt><dd><StatusPill status={String(snapshot.game?.runtime_status || "unknown")} /></dd></div><div><dt>Runtime revision</dt><dd>{String(snapshot.game?.revision ?? "—")}</dd></div><div><dt>Lease owner</dt><dd className="admin-mono">{String(snapshot.worker?.owner_id || "—")}</dd></div><div><dt>Lease until</dt><dd>{date(snapshot.worker?.lease_until ? String(snapshot.worker.lease_until) : null)}</dd></div></dl></article><article className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Delivery backlog</span><h2>Outbox state</h2></div><ServerCog /></div><dl className="admin-detail-list">{Object.entries(snapshot.outbox || {}).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}{!Object.keys(snapshot.outbox || {}).length && <div><dt>Events</dt><dd>None queued</dd></div>}</dl></article></section>

    <section className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Incident queue</span><h2>Deduplicated operational alerts</h2></div><div className="admin-alert-filter"><AdminSelect label="Alert status" value={status} onValueChange={setStatus} options={[{ value: "open", label: "Open" }, { value: "acknowledged", label: "Acknowledged" }, { value: "resolved", label: "Resolved" }]} /></div></div>{rows.length ? <div className="admin-alert-list">{rows.map((alert) => <article className={`admin-alert-row is-${alert.severity}`} key={alert.id}><div className="admin-alert-row__icon">{alert.severity === "critical" ? <TriangleAlert /> : <Bell />}</div><div><div className="admin-alert-row__heading"><strong>{alert.message}</strong><StatusPill status={alert.status} /></div><p>{alert.code} · {alert.source}</p><small>First seen {date(alert.first_seen_at)} · Last seen {date(alert.last_seen_at)}</small></div>{canManage && alert.status !== "resolved" && <div className="admin-alert-row__actions">{alert.status === "open" && <button className="admin-secondary-button" onClick={() => acknowledge.mutate(alert.id)} disabled={acknowledge.isPending}><CheckCircle2 /> Acknowledge</button>}<button className="admin-quiet-button" onClick={() => resolve.mutate(alert.id)} disabled={resolve.isPending}>Resolve</button></div>}</article>)}</div> : <div className="admin-empty"><CheckCircle2 /><p>No {status} alerts. Current monitoring signals are quiet.</p></div>}</section>
  </>;
}
