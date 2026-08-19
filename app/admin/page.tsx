"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Pause, Play, RotateCw, Settings2, Siren } from "lucide-react";
import { useAdminIdentity } from "@/components/admin/admin-gate";
import { useAdminAction, useAdminHealth, useAdminRuntime } from "@/hooks/use-admin";
import { adminClient } from "@/lib/admin-client";
import { ConfirmDialog, ErrorState, LoadingState, MetricCard, PageHeader } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";

function date(value: string | null | undefined) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }
function amount(value: unknown) { try { return new Intl.NumberFormat().format(BigInt(String(value || "0"))); } catch { return String(value || "0"); } }

type Metrics = {
  timezone?: string;
  bets?: { count?: number; unique_bettors?: number; accepted_stake?: string; refunded_stake?: string; net_stake?: string };
  payouts?: { users?: number; total_amount?: string };
  rounds?: { total?: number; cancelled?: number; cancellation_rate?: number };
  settlement?: { average_latency_seconds?: number | null; settled_rounds?: number };
  gross_result?: string;
  time_series?: Array<{ date: string; accepted_stake: string; refunded_stake: string; payout: string; gross_result: string }>;
};

export default function AdminOverviewPage() {
  const identity = useAdminIdentity();
  const runtime = useAdminRuntime();
  const health = useAdminHealth();
  const canReadFinance = identity.role === "super_admin" || identity.role === "finance_operator" || identity.role === "auditor";
  const metrics = useQuery({ queryKey: ["admin", "metrics", "overview"], queryFn: () => adminClient.metrics() as Promise<Metrics>, enabled: canReadFinance, staleTime: 10_000, refetchInterval: 30_000, refetchIntervalInBackground: false });
  const canControl = identity.role === "super_admin" || identity.role === "game_operator";
  const pause = useAdminAction(adminClient.pause);
  const resume = useAdminAction(adminClient.resume);
  if (runtime.isLoading || health.isLoading || (canReadFinance && metrics.isLoading)) return <LoadingState />;
  if (runtime.isError || !runtime.data || health.isError || metrics.isError) return <ErrorState message={(runtime.error || health.error || metrics.error as Error)?.message || "The operations API did not respond."} onRetry={() => { void runtime.refetch(); void health.refetch(); void metrics.refetch(); }} />;
  const data = runtime.data;
  const round = data.current_round;
  const config = data.active_config_version;
  const finance = metrics.data;
  const chartData = (finance?.time_series || []).map((row) => ({ ...row, accepted: Number(row.accepted_stake), refunds: Number(row.refunded_stake), payout: Number(row.payout), gross: Number(row.gross_result) }));
  return <><PageHeader eyebrow="Operations overview" title={`Welcome, ${identity.display_name}.`} description="Live runtime health and authoritative business metrics—without client-side estimates." action={<Link href="/admin/greedy" className="admin-primary-button"><Siren /> Open control room</Link>} />
    {finance ? <section className="admin-metric-grid"><MetricCard label="Accepted stake" value={amount(finance.bets?.accepted_stake)} hint={`${finance.bets?.count || 0} accepted bets`} tone="is-green" /><MetricCard label="Refunds" value={amount(finance.bets?.refunded_stake)} hint={`Net stake ${amount(finance.bets?.net_stake)}`} /><MetricCard label="Stake-inclusive payouts" value={amount(finance.payouts?.total_amount)} hint={`${finance.payouts?.users || 0} paid players`} /><MetricCard label="Gross result" value={amount(finance.gross_result)} hint={`${finance.bets?.unique_bettors || 0} unique bettors`} tone={BigInt(finance.gross_result || "0") >= 0n ? "is-green" : "is-amber"} /></section> : <section className="admin-metric-grid"><MetricCard label="Runtime" value={data.status} hint={`Revision ${data.revision}`} tone={data.status === "running" ? "is-green" : "is-amber"} /><MetricCard label="Current round" value={round ? `#${round.round_number}` : "None"} hint={round ? round.status.replaceAll("_", " ") : "Awaiting runtime"} /><MetricCard label="Active config" value={config ? `v${config.version}` : "None"} hint={config?.status || "Publish a draft to start"} /><MetricCard label="Last update" value={date(data.updated_at).split(",")[0]} hint={date(data.updated_at).split(",").slice(1).join(",").trim()} /></section>}

    {finance && <section className="admin-grid-2"><article className="admin-panel admin-chart-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Business day · {finance.timezone || "Asia/Dhaka"}</span><h2>Stake, refund, and payout movement</h2></div><RotateCw /></div>{chartData.length ? <div className="admin-chart" aria-label="Financial metric time series"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}><defs><linearGradient id="adminStake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3d78c5" stopOpacity={.3} /><stop offset="1" stopColor="#3d78c5" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8490a2" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#8490a2" }} axisLine={false} tickLine={false} width={50} /><Tooltip formatter={(value) => amount(value)} /><Area type="monotone" dataKey="accepted" name="Accepted stake" stroke="#3d78c5" fill="url(#adminStake)" strokeWidth={2} /><Area type="monotone" dataKey="payout" name="Payout" stroke="#e19a2a" fill="transparent" strokeWidth={2} /><Area type="monotone" dataKey="refunds" name="Refunds" stroke="#d85a63" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div> : <div className="admin-empty"><p>No activity in the selected metrics window.</p></div>}</article><article className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Round quality</span><h2>Settlement performance</h2></div><StatusPill status={(finance.settlement?.average_latency_seconds ?? 0) < 10 ? "healthy" : "warning"} /></div><dl className="admin-detail-list"><div><dt>Rounds</dt><dd>{finance.rounds?.total || 0}</dd></div><div><dt>Cancelled</dt><dd>{finance.rounds?.cancelled || 0}</dd></div><div><dt>Cancellation rate</dt><dd>{Number(finance.rounds?.cancellation_rate || 0).toFixed(2)}%</dd></div><div><dt>Average settlement latency</dt><dd>{finance.settlement?.average_latency_seconds == null ? "—" : `${Number(finance.settlement.average_latency_seconds).toFixed(2)} sec`}</dd></div><div><dt>Settled rounds</dt><dd>{finance.settlement?.settled_rounds || 0}</dd></div></dl></article></section>}

    <section className="admin-grid-2"><article className="admin-panel admin-panel--hero"><div className="admin-panel__top"><div><span className="admin-eyebrow">Live status</span><h2>Runtime command center</h2></div><StatusPill status={data.status} /></div><div className="admin-runtime-banner"><span className={`admin-runtime-orb ${data.status}`} /><div><strong>{data.status === "running" ? "Game worker is running" : `Runtime is ${data.status}`}</strong><p>{round ? `Round #${round.round_number} is ${round.status.replaceAll("_", " ")}.` : "There is no active round assigned."}</p></div></div><div className="admin-button-row"><Link href="/admin/greedy" className="admin-secondary-button">View details <ArrowRight /></Link>{canControl && (data.status === "running" ? <ConfirmDialog trigger={<button className="admin-quiet-button"><Pause /> Pause runtime</button>} title="Pause the Greedy runtime?" description="The current round completes safely; no new round starts until resume." confirmLabel="Pause runtime" onConfirm={() => pause.mutateAsync()} /> : <button className="admin-primary-button" onClick={() => resume.mutate()} disabled={resume.isPending}><Play /> Resume runtime</button>)}</div></article>
      <article className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Configuration</span><h2>Active game setup</h2></div><Settings2 /></div>{config ? <div className="admin-config-summary"><div><strong>Version {config.version}</strong><StatusPill status={config.status} /></div><p>{config.options.length} options · {config.chip_values.filter((item) => item.is_enabled).length} active chips</p><dl><div><dt>Betting window</dt><dd>{Math.round(config.betting_duration_ms / 1000)} sec</dd></div><div><dt>Minimum bet</dt><dd>{config.min_bet}</dd></div><div><dt>Max round bet</dt><dd>{config.max_round_bet}</dd></div></dl><Link href="/admin/greedy/configs" className="admin-text-link">Review versions <ArrowRight /></Link></div> : <div className="admin-empty"><p>No published config is active.</p>{canControl && <Link href="/admin/greedy/configs/new" className="admin-primary-button">Create first config <ArrowRight /></Link>}</div>}</article></section>
  </>;
}
