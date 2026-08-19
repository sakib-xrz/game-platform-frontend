"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pause, Play, RefreshCw, ShieldAlert, Siren, Square, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAdminIdentity } from "@/components/admin/admin-gate";
import { AdminSelect, ConfirmDialog, ErrorState, LoadingState, PageHeader, StatusPill } from "@/components/admin/admin-ui";
import { useAdminApprovals, useAdminHealth, useAdminRuntime } from "@/hooks/use-admin";
import { adminClient, adminFetch } from "@/lib/admin-client";
import type { AdminApproval } from "@/types/admin";

function date(value: string | null | undefined) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "—"; }
function coins(value: unknown) { const amount = String(value || "0"); return `${new Intl.NumberFormat().format(Number(amount))} COIN`; }

export default function GreedyOperationsPage() {
  const identity = useAdminIdentity();
  const cache = useQueryClient();
  const runtimeQuery = useAdminRuntime();
  const healthQuery = useAdminHealth();
  const approvalsQuery = useAdminApprovals();
  const [reason, setReason] = useState("");
  const [availability, setAvailability] = useState<"active" | "maintenance" | "disabled">("active");
  const runtime = runtimeQuery.data;
  const round = runtime?.current_round;
  const roundQuery = useQuery({ queryKey: ["admin", "round", round?.id], queryFn: () => adminFetch<{ round: Record<string, unknown>; financials: Record<string, unknown> }>(`/greedy/rounds/${round!.id}`), enabled: Boolean(round?.id), refetchInterval: 3_000, refetchIntervalInBackground: false });
  const refresh = async () => { await Promise.all([runtimeQuery.refetch(), healthQuery.refetch(), approvalsQuery.refetch(), roundQuery.refetch()]); };
  const afterMutation = async () => { await cache.invalidateQueries({ queryKey: ["admin"] }); await refresh(); };
  const pause = useMutation({ mutationFn: adminClient.pause, onSuccess: afterMutation });
  const resume = useMutation({ mutationFn: adminClient.resume, onSuccess: afterMutation });
  const cancel = useMutation({ mutationFn: ({ cancellationReason, approvalId }: { cancellationReason: string; approvalId?: string }) => adminClient.cancel(cancellationReason, approvalId), onSuccess: async (result) => { if (result?.status === "pending_approval") await approvalsQuery.refetch(); await afterMutation(); } });
  const setGameAvailability = useMutation({ mutationFn: adminClient.setAvailability, onSuccess: afterMutation });
  const decide = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) => decision === "approve" ? adminClient.approve(id, "Verified current round and refundable exposure") : adminClient.reject(id, "Cancellation request rejected after review"), onSuccess: () => approvalsQuery.refetch() });

  if (runtimeQuery.isLoading || healthQuery.isLoading) return <LoadingState />;
  if (runtimeQuery.isError || !runtime || healthQuery.isError) return <ErrorState message={(runtimeQuery.error || healthQuery.error as Error)?.message || "Runtime unavailable"} onRetry={() => void refresh()} />;
  const health = (healthQuery.data || {}) as { game?: { status?: string } };
  const canControl = identity.role === "super_admin" || identity.role === "game_operator";
  const cancellable = Boolean(round && ["created", "betting_open", "betting_locked"].includes(round.status));
  const exposure = roundQuery.data?.financials?.total_bet_amount || "0";
  const approvals = (approvalsQuery.data || []) as AdminApproval[];
  const cancellationApprovals = approvals.filter((item) => item.action_type === "greedy.round.cancel" && (!round || item.target_id === round.id));
  const ownApproved = cancellationApprovals.find((item) => item.requested_by_admin_id === identity.id && item.status === "approved");
  const reviewable = cancellationApprovals.filter((item) => item.requested_by_admin_id !== identity.id && item.status === "pending");
  const mutationError = pause.error || resume.error || cancel.error || setGameAvailability.error || decide.error;

  return <><PageHeader eyebrow="Greedy / live operations" title="Control room" description="Monitor authoritative state, verify exposure, and intervene through audited, approval-aware controls." action={<button onClick={() => void refresh()} className="admin-secondary-button"><RefreshCw className={runtimeQuery.isFetching ? "admin-spin" : ""} /> Refresh</button>} />
    {mutationError && <div className="admin-form-error" role="alert">{mutationError.message}</div>}
    <section className="admin-control-strip"><div><span className="admin-eyebrow">Availability / runtime</span><strong>{health.game?.status || "unknown"} · {runtime.status}</strong><StatusPill status={runtime.status} /></div><div><span className="admin-eyebrow">Revision</span><strong>{runtime.revision}</strong><small>Last update {date(runtime.updated_at)}</small></div>{canControl ? <div className="admin-control-actions">{runtime.status === "running" ? <ConfirmDialog trigger={<button className="admin-quiet-button"><Pause /> Pause</button>} title="Pause runtime?" description="The active round will finish safely. New rounds stop until resume." confirmLabel="Pause runtime" onConfirm={() => pause.mutateAsync()} /> : <button className="admin-primary-button" onClick={() => resume.mutate()} disabled={resume.isPending || health.game?.status === "disabled"}><Play /> Resume</button>}{round && cancellable && <ConfirmDialog trigger={<button className="admin-danger-button"><Square /> Cancel round</button>} title="Cancel and refund this round?" description={`Authoritative refundable exposure is ${coins(exposure)}. At or above 10,000 COIN, a second eligible administrator must approve this exact snapshot.`} confirmLabel="Submit cancellation" confirmDisabled={reason.trim().length < 3} destructive onConfirm={() => cancel.mutateAsync({ cancellationReason: reason.trim() })}><label className="admin-dialog-field">Required reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={250} placeholder="Operational incident or ticket" required /></label></ConfirmDialog>}</div> : <span className="admin-readonly">Read-only verification access</span>}</section>

    {canControl && <section className="admin-panel admin-availability-panel"><div><span className="admin-eyebrow">Availability policy</span><h2>Schedule a safe state transition</h2><p>Maintenance finishes the active round and prevents another. Disable is super-admin-only and requires no live round.</p></div><div className="admin-availability-actions"><AdminSelect label="Game availability" value={availability} onValueChange={(value) => setAvailability(value as typeof availability)} options={[{ value: "active", label: "Active" }, { value: "maintenance", label: "Maintenance" }, ...(identity.role === "super_admin" ? [{ value: "disabled", label: "Disabled" }] : [])]} /><ConfirmDialog trigger={<button className="admin-secondary-button"><Wrench /> Apply state</button>} title={`Set Greedy to ${availability}?`} description={availability === "maintenance" ? "The active round may finish; no new round will start." : availability === "disabled" ? "This succeeds only when no round is live." : "Future rounds may start after a valid config is active."} confirmLabel="Apply availability" destructive={availability === "disabled"} onConfirm={() => setGameAvailability.mutateAsync(availability)} /></div></section>}

    <section className="admin-grid-2"><article className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Current round</span><h2>{round ? `Round #${round.round_number}` : "No active round"}</h2></div>{round && <StatusPill status={round.status} />}</div>{round ? <><dl className="admin-detail-list"><div><dt>Round ID</dt><dd className="admin-mono">{round.id}</dd></div><div><dt>Refundable exposure</dt><dd>{roundQuery.isLoading ? "Loading…" : coins(exposure)}</dd></div><div><dt>Betting starts</dt><dd>{date(round.betting_started_at)}</dd></div><div><dt>Betting ends</dt><dd>{date(round.betting_ends_at)}</dd></div><div><dt>Drawing starts</dt><dd>{date(round.drawing_started_at)}</dd></div><div><dt>Reveal (UTC detail)</dt><dd>{date(round.result_reveal_at)}</dd></div></dl><Link className="admin-text-link" href={`/admin/rounds/${round.id}`}>Open full round evidence</Link></> : <div className="admin-empty"><ShieldAlert /><p>The worker creates a round only when availability and runtime allow it.</p></div>}</article><article className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Active configuration</span><h2>{runtime.active_config_version ? `Version ${runtime.active_config_version.version}` : "Not configured"}</h2></div>{runtime.active_config_version && <StatusPill status={runtime.active_config_version.status} />}</div>{runtime.active_config_version ? <dl className="admin-detail-list"><div><dt>Options</dt><dd>{runtime.active_config_version.options.filter((item) => item.is_enabled).length} enabled</dd></div><div><dt>Chips</dt><dd>{runtime.active_config_version.chip_values.filter((item) => item.is_enabled).length} enabled</dd></div><div><dt>Betting duration</dt><dd>{Math.round(runtime.active_config_version.betting_duration_ms / 1000)} seconds</dd></div><div><dt>Limits</dt><dd>{runtime.active_config_version.min_bet} min · {runtime.active_config_version.max_round_bet} round max</dd></div></dl> : <Link className="admin-primary-button" href="/admin/greedy/configs/new">Create configuration</Link>}</article></section>

    {(reviewable.length > 0 || ownApproved) && <section className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Dual control</span><h2>Round cancellation approval</h2></div><Siren /></div><div className="admin-approval-list">{reviewable.map((approval) => <div className="admin-approval-row" key={approval.id}><div><strong>Cancellation snapshot</strong><small>Exposure {coins(approval.payload?.exposure)} · Reason: {String(approval.payload?.reason || "—")}</small><span><StatusPill status={approval.status} /></span></div><div className="admin-approval-actions"><button className="admin-secondary-button" onClick={() => decide.mutate({ id: approval.id, decision: "reject" })}>Reject</button><button className="admin-primary-button" onClick={() => decide.mutate({ id: approval.id, decision: "approve" })}><CheckCircle2 /> Approve snapshot</button></div></div>)}{ownApproved && <div className="admin-approval-row"><div><strong>Approved cancellation</strong><small>Approval {ownApproved.id} expires {date(ownApproved.expires_at)}</small><span><StatusPill status="approved" /></span></div><button className="admin-danger-button" disabled={!cancellable} onClick={() => cancel.mutate({ cancellationReason: String(ownApproved.payload?.reason || "Approved cancellation"), approvalId: ownApproved.id })}><Square /> Execute once</button></div>}</div></section>}

    <div className="admin-callout"><Siren /><div><strong>Results remain worker-generated.</strong><p>No administrator control can select, edit, replace, or delete a result. Approved actions execute only against their frozen payload hash.</p></div></div>
  </>;
}
