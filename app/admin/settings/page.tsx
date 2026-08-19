"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Laptop, Plus, RotateCcw, Save, Settings2, ShieldOff, UserCog } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminSelect, ConfirmDialog, ErrorState, LoadingState, PageHeader, StatusPill } from "@/components/admin/admin-ui";
import { useAdminIdentity } from "@/components/admin/admin-gate";
import { adminClient } from "@/lib/admin-client";
import type { AdminRole, AdminSessionRecord, AdminUserRecord } from "@/types/admin";

const roleOptions = [
  { value: "super_admin", label: "Super administrator" },
  { value: "game_operator", label: "Game operator" },
  { value: "finance_operator", label: "Finance operator" },
  { value: "support", label: "Support" },
  { value: "auditor", label: "Auditor" },
];

const createSchema = z.object({
  email: z.string().email(),
  display_name: z.string().trim().min(1).max(120),
  role: z.enum(["super_admin", "game_operator", "finance_operator", "support", "auditor"]),
  password: z.string().min(12).max(128),
});
type CreateValues = z.infer<typeof createSchema>;

function date(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

function AdminRow({ admin }: { admin: AdminUserRecord }) {
  const client = useQueryClient();
  const [role, setRole] = useState<AdminRole>(admin.role);
  const [status, setStatus] = useState(admin.status);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const update = useMutation({ mutationFn: () => adminClient.updateAdminUser(admin.id, { role, status }), onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "users"] }) });
  const revoke = useMutation({ mutationFn: () => adminClient.revokeAdminUserSessions(admin.id), onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "users"] }) });
  const resetPassword = useMutation({ mutationFn: () => adminClient.resetAdminUserPassword(admin.id, temporaryPassword), onSuccess: () => { setTemporaryPassword(""); void client.invalidateQueries({ queryKey: ["admin", "users"] }); } });
  const operationError = update.error || revoke.error || resetPassword.error;
  return <div className="admin-user-row">
    <div className="admin-user-row__identity"><span>{admin.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{admin.display_name}</strong><small>{admin.email}</small><small>Last login: {date(admin.last_login_at)}</small></div></div>
    <div><StatusPill status={admin.status} />{admin.force_password_change && <small className="admin-table-sub">Password change required</small>}</div>
    <label>Role<AdminSelect label={`Role for ${admin.email}`} value={role} onValueChange={(value) => setRole(value as AdminRole)} options={roleOptions} /></label>
    <label>Status<AdminSelect label={`Status for ${admin.email}`} value={status} onValueChange={(value) => setStatus(value as typeof status)} options={[{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }, { value: "locked", label: "Locked" }]} /></label>
    <div className="admin-user-row__actions"><button className="admin-secondary-button" onClick={() => update.mutate()} disabled={update.isPending || (role === admin.role && status === admin.status)}><Save /> Save</button><button className="admin-quiet-button" onClick={() => revoke.mutate()} disabled={revoke.isPending}><ShieldOff /> Revoke sessions</button></div>
    <div className="admin-user-row__reset"><input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} minLength={12} maxLength={128} placeholder="New temporary password" aria-label={`Temporary password for ${admin.email}`} /><button className="admin-quiet-button" onClick={() => resetPassword.mutate()} disabled={resetPassword.isPending || temporaryPassword.length < 12}><RotateCcw /> Reset</button></div>
    {operationError && <div className="admin-form-error" role="alert">{operationError.message}</div>}
  </div>;
}

export default function AdminSettingsPage() {
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminClient.adminUsers });
  const sessions = useQuery({ queryKey: ["admin", "sessions"], queryFn: adminClient.sessions });
  const policy = useQuery({ queryKey: ["admin", "policy"], queryFn: adminClient.policy });
  const [threshold, setThreshold] = useState("");
  const [expiry, setExpiry] = useState("1440");
  const [policyInitialized, setPolicyInitialized] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { email: "", display_name: "", role: "support", password: "" } });
  const create = useMutation({ mutationFn: adminClient.createAdminUser, onSuccess: async () => { reset(); await queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); } });
  const savePolicy = useMutation({ mutationFn: () => adminClient.updatePolicy({ wallet_adjustment_threshold: threshold, approval_expiry_minutes: Number(expiry) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "policy"] }) });
  const revokeSession = useMutation({ mutationFn: adminClient.revokeSession, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] }) });

  useEffect(() => {
    if (!policy.data || policyInitialized) return;
    const value = policy.data as { wallet_adjustment_threshold?: string; approval_expiry_minutes?: number };
    setThreshold(value.wallet_adjustment_threshold || "10000");
    setExpiry(String(value.approval_expiry_minutes || 1440));
    setPolicyInitialized(true);
  }, [policy.data, policyInitialized]);
  if (users.isLoading || sessions.isLoading || policy.isLoading) return <LoadingState />;
  if (users.isError || sessions.isError || policy.isError) return <ErrorState message={(users.error || sessions.error || policy.error as Error)?.message || "Settings are unavailable"} />;

  return <><PageHeader eyebrow="System / settings" title="Administrators & policy" description="Provision accountable operators, control live sessions, and maintain dual-control thresholds." />
    <section className="admin-grid-2"><form className="admin-panel admin-form-card" onSubmit={handleSubmit((values) => create.mutate({ ...values, force_password_change: true }))}><div className="admin-panel__top"><div><span className="admin-eyebrow">Administrator provisioning</span><h2>Create account</h2></div><UserCog /></div><label>Display name<input {...register("display_name")} />{errors.display_name && <em>{errors.display_name.message}</em>}</label><label>Email<input type="email" {...register("email")} />{errors.email && <em>{errors.email.message}</em>}</label><label>Role<AdminSelect label="New administrator role" value={watch("role")} onValueChange={(value) => setValue("role", value as AdminRole, { shouldValidate: true })} options={roleOptions} /></label><label>One-time temporary password<input type="password" {...register("password")} autoComplete="new-password" />{errors.password && <em>{errors.password.message}</em>}</label><small>The administrator must replace this password before accessing operational data.</small>{create.error && <div className="admin-form-error" role="alert">{create.error.message}</div>}<button className="admin-primary-button" disabled={create.isPending}><Plus /> Create administrator</button></form>
      <article className="admin-panel admin-form-card"><div className="admin-panel__top"><div><span className="admin-eyebrow">Approval policy</span><h2>Dual-control guardrails</h2></div><Settings2 /></div><label>Wallet approval threshold<input value={threshold} onChange={(event) => setThreshold(event.target.value)} inputMode="numeric" pattern="^\d+$" /></label><label>Approval expiry (minutes)<input value={expiry} onChange={(event) => setExpiry(event.target.value)} type="number" min={1} max={10080} /></label>{savePolicy.error && <div className="admin-form-error" role="alert">{savePolicy.error.message}</div>}{savePolicy.isSuccess && <div className="admin-form-success" role="status"><CheckCircle2 /> Policy saved and audited.</div>}<button className="admin-primary-button" onClick={() => savePolicy.mutate()} disabled={savePolicy.isPending || !/^\d+$/.test(threshold)}><Save /> Save policy</button></article></section>

    <section className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Directory</span><h2>{users.data?.length || 0} administrators</h2></div><UserCog /></div><div className="admin-user-list">{users.data?.map((admin) => <AdminRow admin={admin} key={admin.id} />)}</div></section>

    <section className="admin-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Your security</span><h2>Active sessions</h2></div><Laptop /></div><div className="admin-session-list">{(sessions.data as AdminSessionRecord[]).map((session) => <div key={session.id}><div><strong>{session.user_agent || "Unknown client"}</strong><small>{session.ip_address || "Unknown IP"} · Last seen {date(session.last_seen_at)}</small><small>Absolute expiry {date(session.absolute_expires_at)}</small></div><ConfirmDialog trigger={<button className="admin-quiet-button"><KeyRound /> Revoke</button>} title="Revoke this session?" description="The selected browser will need to sign in again. Revoking the current session will close this console." confirmLabel="Revoke session" destructive onConfirm={() => revokeSession.mutateAsync(session.id)} /></div>)}</div><p className="admin-panel-note">Signed in as {identity.email}. At most three active sessions are retained.</p></section>
  </>;
}
