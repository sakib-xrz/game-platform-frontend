"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Fingerprint,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TicketCheck,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAdminIdentity } from "@/components/admin/admin-gate";
import {
  ConfirmDialog,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusPill,
} from "@/components/admin/admin-ui";
import { adminClient } from "@/lib/admin-client";
import { formatAdminAmount, formatUtc, humanizeAdminValue } from "@/lib/admin-display";
import type { AdminApproval, WalletAdjustmentInput, WalletAdjustmentResult } from "@/types/admin";

function walletPayload(approval: AdminApproval): WalletAdjustmentInput | null {
  const payload = approval.payload;
  const userId = payload.user_id;
  const direction = payload.direction;
  const amount = payload.amount;
  const ticketReference = payload.ticket_reference;
  const reason = payload.reason;
  if (
    typeof userId !== "string"
    || (direction !== "credit" && direction !== "debit")
    || typeof amount !== "string"
    || !/^[1-9]\d*$/.test(amount)
    || typeof ticketReference !== "string"
    || typeof reason !== "string"
  ) return null;
  return {
    user_id: userId,
    direction,
    amount,
    ticket_reference: ticketReference,
    reason,
  };
}

function isExpired(approval: AdminApproval) {
  return new Date(approval.expires_at).getTime() <= Date.now();
}

function FrozenWalletPayload({ approval }: { approval: AdminApproval }) {
  const payload = walletPayload(approval);
  if (!payload) {
    return (
      <div className="admin-form-error admin-finance-payload-error" role="alert">
        The frozen payload is incomplete or uses an unsupported legacy shape. It cannot be applied from this console.
      </div>
    );
  }
  return (
    <dl className="admin-finance-payload">
      <div><dt>Player ID</dt><dd className="admin-mono-cell" title={payload.user_id}>{payload.user_id}</dd></div>
      <div><dt>Direction</dt><dd><StatusPill status={payload.direction} /></dd></div>
      <div><dt>Amount</dt><dd>{formatAdminAmount(payload.amount)}</dd></div>
      <div><dt>Ticket</dt><dd>{payload.ticket_reference}</dd></div>
      <div className="admin-finance-payload__reason"><dt>Reason</dt><dd>{payload.reason}</dd></div>
    </dl>
  );
}

function ReviewActions({ approval, onDone }: { approval: AdminApproval; onDone: () => Promise<unknown> }) {
  const [note, setNote] = useState("");
  const decision = useMutation({
    mutationFn: (value: "approve" | "reject") => value === "approve"
      ? adminClient.approve(approval.id, note.trim())
      : adminClient.reject(approval.id, note.trim()),
    onSuccess: async () => { setNote(""); await onDone(); },
  });
  const ready = note.trim().length >= 3;

  return (
    <div className="admin-finance-review">
      <label>
        Required review note
        <textarea
          value={note}
          minLength={3}
          maxLength={250}
          rows={2}
          placeholder="Document the independent review"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {decision.error && <div className="admin-form-error" role="alert">{decision.error.message}</div>}
      <div className="admin-approval-actions">
        <button
          className="admin-secondary-button"
          type="button"
          disabled={!ready || decision.isPending}
          onClick={() => decision.mutate("reject")}
        >
          <ShieldX /> Reject
        </button>
        <button
          className="admin-primary-button"
          type="button"
          disabled={!ready || decision.isPending}
          onClick={() => decision.mutate("approve")}
        >
          {decision.isPending ? <Loader2 className="admin-spin" /> : <ShieldCheck />} Approve exact payload
        </button>
      </div>
    </div>
  );
}

function ApplyApprovedAction({ approval, onDone }: { approval: AdminApproval; onDone: () => Promise<unknown> }) {
  const payload = walletPayload(approval);
  const apply = useMutation({
    mutationFn: async () => {
      if (!payload) throw new Error("The approved payload is invalid");
      return adminClient.adjustWallet({ ...payload, approval_id: approval.id });
    },
    onSuccess: onDone,
  });

  return (
    <div className="admin-finance-apply">
      <ConfirmDialog
        trigger={
          <button className="admin-primary-button" type="button" disabled={!payload || apply.isPending}>
            {apply.isPending ? <Loader2 className="admin-spin" /> : <FileCheck2 />} Apply approved adjustment
          </button>
        }
        title="Apply this approved wallet adjustment?"
        description="Only the original requester may execute it. The exact frozen payload below is resubmitted with this approval ID; no field can be changed."
        confirmLabel="Apply exactly once"
        confirmDisabled={!payload || apply.isPending}
        onConfirm={() => apply.mutateAsync()}
      >
        <FrozenWalletPayload approval={approval} />
      </ConfirmDialog>
      {apply.error && <div className="admin-form-error" role="alert">{apply.error.message}</div>}
      <p><LockKeyhole /> The backend atomically marks the approval applied with the wallet ledger write.</p>
    </div>
  );
}

function ApprovalCard({ approval, actorId, actorRole, onDone }: {
  approval: AdminApproval;
  actorId: string;
  actorRole: string;
  onDone: () => Promise<unknown>;
}) {
  const ownRequest = approval.requested_by_admin_id === actorId;
  const expired = isExpired(approval);
  const canReview = !ownRequest
    && approval.status === "pending"
    && !expired
    && (actorRole === "super_admin" || actorRole === "finance_operator");
  const canApply = ownRequest && approval.status === "approved" && !expired;

  return (
    <article className={`admin-finance-approval ${canReview ? "is-reviewable" : canApply ? "is-applicable" : ""}`}>
      <header>
        <div>
          <span className="admin-eyebrow">Wallet adjustment request</span>
          <h3>{ownRequest ? "Your request" : "Independent review required"}</h3>
          <small className="admin-mono-cell" title={approval.id}>{approval.id}</small>
        </div>
        <StatusPill status={expired && approval.status === "pending" ? "expired" : approval.status} />
      </header>

      <FrozenWalletPayload approval={approval} />

      <dl className="admin-finance-evidence">
        <div><dt><UserCheck /> Requester admin</dt><dd className="admin-mono-cell" title={approval.requested_by_admin_id}>{approval.requested_by_admin_id}</dd></div>
        <div><dt><WalletCards /> Target wallet</dt><dd className="admin-mono-cell" title={approval.target_id || undefined}>{approval.target_id || "Not resolved"}</dd></div>
        <div><dt><Clock3 /> Expires (UTC)</dt><dd>{formatUtc(approval.expires_at)}</dd></div>
        <div><dt><TicketCheck /> Created (UTC)</dt><dd>{formatUtc(approval.created_at)}</dd></div>
        <div><dt><Fingerprint /> Payload hash</dt><dd className="admin-mono-cell" title={approval.payload_hash}>{approval.payload_hash}</dd></div>
        <div><dt><LockKeyhole /> Idempotency key</dt><dd className="admin-mono-cell" title={approval.idempotency_key}>{approval.idempotency_key}</dd></div>
      </dl>

      {approval.decisions.length > 0 && (
        <div className="admin-finance-decisions">
          <strong>Decision evidence</strong>
          {approval.decisions.map((item) => (
            <div key={item.id}>
              <StatusPill status={item.decision} />
              <span className="admin-mono-cell">{item.admin_user_id}</span>
              <span>{item.reason || "No note recorded"}</span>
              <small>{formatUtc(item.created_at)} · <span className="admin-mono-cell">{item.id}</span></small>
            </div>
          ))}
        </div>
      )}

      {canReview && <ReviewActions approval={approval} onDone={onDone} />}
      {canApply && <ApplyApprovedAction approval={approval} onDone={onDone} />}
      {ownRequest && approval.status === "pending" && !expired && (
        <div className="admin-finance-state-note"><LockKeyhole /><span><strong>Awaiting an eligible second administrator</strong>You cannot decide your own request.</span></div>
      )}
      {!ownRequest && approval.status === "approved" && (
        <div className="admin-finance-state-note"><CheckCircle2 /><span><strong>Review complete</strong>The original requester must apply this approved payload.</span></div>
      )}
      {approval.status === "applied" && (
        <div className="admin-finance-state-note is-success"><CheckCircle2 /><span><strong>Applied exactly once</strong>{formatUtc(approval.applied_at)}</span></div>
      )}
      {(expired || approval.status === "expired") && approval.status !== "applied" && (
        <div className="admin-finance-state-note is-expired"><Clock3 /><span><strong>Approval expired</strong>Create a new request to use a fresh wallet snapshot and approval window.</span></div>
      )}
      {approval.execution_error && <div className="admin-form-error" role="alert">Execution error: {approval.execution_error}</div>}
    </article>
  );
}

export default function AdminFinancePage() {
  const identity = useAdminIdentity();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [ticket, setTicket] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WalletAdjustmentResult | null>(null);
  const [error, setError] = useState("");
  const approvals = useQuery({
    queryKey: ["admin", "approvals", "finance"],
    queryFn: () => adminClient.approvalsPaged("?page=1&limit=100"),
    refetchInterval: 8_000,
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await adminClient.adjustWallet({
        user_id: userId.trim(),
        direction,
        amount: amount.trim(),
        ticket_reference: ticket.trim(),
        reason: reason.trim(),
      });
      setResult(response);
      setUserId("");
      setAmount("");
      setTicket("");
      setReason("");
      await approvals.refetch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = (approvals.data?.data ?? []).filter((approval) => approval.action_type === "wallet.adjust");
  const reviewable = rows.filter((approval) => approval.requested_by_admin_id !== identity.id && approval.status === "pending" && !isExpired(approval));
  const applicable = rows.filter((approval) => approval.requested_by_admin_id === identity.id && approval.status === "approved" && !isExpired(approval));
  const waiting = rows.filter((approval) => approval.requested_by_admin_id === identity.id && approval.status === "pending" && !isExpired(approval));
  const history = rows.filter((approval) => !reviewable.includes(approval) && !applicable.includes(approval) && !waiting.includes(approval));

  return (
    <>
      <PageHeader
        eyebrow="Finance / maker-checker control"
        title="Wallet adjustments"
        description="Submit corrections, independently review another administrator’s exact frozen payload, and apply your approved request exactly once."
        action={
          <button className="admin-secondary-button" type="button" disabled={approvals.isFetching} onClick={() => approvals.refetch()}>
            <RefreshCw className={approvals.isFetching ? "admin-spin" : ""} /> Refresh queue
          </button>
        }
      />

      <section className="admin-callout admin-callout--warning">
        <AlertTriangle />
        <div>
          <strong>Dual control is enforced by the server</strong>
          <p>Threshold requests cannot be self-approved. Approval freezes player, direction, amount, reason, and ticket; the original requester alone may execute the approved payload.</p>
        </div>
      </section>

      <div className="admin-finance-layout">
        <form className="admin-panel admin-form-card admin-finance-form" onSubmit={submit}>
          <div className="admin-panel__top">
            <div><span className="admin-eyebrow">Maker action</span><h2>Submit wallet adjustment</h2></div>
            <Banknote />
          </div>
          <label>
            Exact player ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="user-001" required maxLength={128} />
          </label>
          <div className="admin-form-grid admin-form-grid--2">
            <label>
              Direction
              <select value={direction} onChange={(event) => setDirection(event.target.value as "credit" | "debit")}>
                <option value="credit">Credit wallet</option>
                <option value="debit">Debit wallet</option>
              </select>
            </label>
            <label>
              Positive amount
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder="10000" pattern="^[1-9]\d*$" required />
            </label>
          </div>
          <label>
            Ticket / external reference
            <input value={ticket} onChange={(event) => setTicket(event.target.value)} placeholder="SUP-1042" minLength={3} maxLength={128} required />
          </label>
          <label>
            Reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Correction context and evidence" minLength={3} maxLength={250} required />
          </label>
          {error && <div className="admin-form-error" role="alert">{error}</div>}
          {result && (
            <div className="admin-form-success admin-finance-submit-result" role="status">
              <CheckCircle2 />
              <span>
                <strong>{result.status === "pending_approval" ? "Submitted for independent approval" : "Adjustment applied"}</strong>
                {result.approval_id && <small>Request <span className="admin-mono-cell">{result.approval_id}</span> · expires {formatUtc(result.expires_at)}</small>}
                {result.wallet && <small>Wallet balance {formatAdminAmount(result.wallet.balance)} · version {result.wallet.version}</small>}
              </span>
            </div>
          )}
          <button className="admin-primary-button" disabled={busy}>
            {busy ? <Loader2 className="admin-spin" /> : <ArrowRight />}{busy ? "Submitting…" : "Submit exact request"}
          </button>
        </form>

        <aside className="admin-panel admin-finance-guide">
          <div className="admin-panel__top">
            <div><span className="admin-eyebrow">Control evidence</span><h2>Lifecycle</h2></div>
            <ShieldCheck />
          </div>
          <ol>
            <li><span>1</span><div><strong>Submit</strong><p>The backend resolves the wallet and freezes the exact payload.</p></div></li>
            <li><span>2</span><div><strong>Independent decision</strong><p>A different eligible administrator verifies and approves or rejects it.</p></div></li>
            <li><span>3</span><div><strong>Requester applies</strong><p>The original maker resubmits the frozen payload with the approved request ID.</p></div></li>
            <li><span>4</span><div><strong>Atomic completion</strong><p>Wallet, ledger, audit, and applied status are committed together.</p></div></li>
          </ol>
          <div className="admin-finance-guide__identity">
            <span>Signed-in administrator</span>
            <strong>{identity.display_name}</strong>
            <small>{humanizeAdminValue(identity.role)} · <span className="admin-mono-cell">{identity.id}</span></small>
          </div>
        </aside>
      </div>

      {approvals.isLoading ? (
        <LoadingState label="Loading wallet approval queue…" />
      ) : approvals.isError ? (
        <ErrorState message={(approvals.error as Error).message} onRetry={() => approvals.refetch()} />
      ) : (
        <section className="admin-finance-queue">
          <div className="admin-finance-queue__heading">
            <div><span className="admin-eyebrow">Wallet requests only</span><h2>Approval and application queue</h2><p>Other game and configuration approvals are intentionally excluded from this finance view.</p></div>
            <div>
              <span><strong>{reviewable.length}</strong> to review</span>
              <span><strong>{applicable.length}</strong> to apply</span>
              <span><strong>{waiting.length}</strong> waiting</span>
            </div>
          </div>

          {reviewable.length > 0 && <div className="admin-finance-group"><h3>Independent review required</h3>{reviewable.map((approval) => <ApprovalCard key={approval.id} approval={approval} actorId={identity.id} actorRole={identity.role} onDone={() => approvals.refetch()} />)}</div>}
          {applicable.length > 0 && <div className="admin-finance-group"><h3>Approved — ready for you to apply</h3>{applicable.map((approval) => <ApprovalCard key={approval.id} approval={approval} actorId={identity.id} actorRole={identity.role} onDone={() => approvals.refetch()} />)}</div>}
          {waiting.length > 0 && <div className="admin-finance-group"><h3>Your requests awaiting review</h3>{waiting.map((approval) => <ApprovalCard key={approval.id} approval={approval} actorId={identity.id} actorRole={identity.role} onDone={() => approvals.refetch()} />)}</div>}
          {history.length > 0 && <div className="admin-finance-group is-history"><h3>Resolved and expired requests</h3>{history.map((approval) => <ApprovalCard key={approval.id} approval={approval} actorId={identity.id} actorRole={identity.role} onDone={() => approvals.refetch()} />)}</div>}
          {!rows.length && (
            <div className="admin-empty-page admin-empty-page--compact">
              <div className="admin-empty-page__icon"><Banknote /></div>
              <h2>No relevant wallet requests</h2>
              <p>Your actor-scoped approval feed contains no wallet adjustments. Other approval types are not shown here.</p>
            </div>
          )}
          {(approvals.data?.meta.total ?? 0) > 100 && <p className="admin-panel-note">Showing the newest 100 actor-relevant approval records.</p>}
        </section>
      )}
    </>
  );
}
