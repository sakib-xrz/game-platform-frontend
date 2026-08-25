"use client";

import type { AdminError, AdminPagedResult } from "@/types/admin";

function csrfToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.split("; ").find((item) => item.startsWith("admin_csrf="))?.split("=")[1] || "";
}

export class AdminRequestError extends Error {
  constructor(message: string, public readonly requestId?: string, public readonly errors?: string[]) {
    super(requestId ? `${message} (Request ${requestId})` : message);
    this.name = "AdminRequestError";
  }
}

async function adminResponse<T>(path: string, init: RequestInit = {}) {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (!isForm) headers.set("Content-Type", "application/json");
    headers.set("X-CSRF-Token", csrfToken());
    if (!headers.has("Idempotency-Key")) headers.set("Idempotency-Key", crypto.randomUUID());
    if (!headers.has("X-Request-Id")) headers.set("X-Request-Id", crypto.randomUUID());
  }
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers,
  });
  const body = (await response.json().catch(() => null)) as ({ data?: T; meta?: { page?: number; limit?: number; total?: number } } & AdminError) | null;
  const requestId = response.headers.get("x-request-id") || undefined;
  if (!response.ok) throw new AdminRequestError(body?.message || `Admin request failed (${response.status})`, requestId, body?.errors);
  return { body, requestId };
}

export async function adminFetch<T>(path: string, init: RequestInit = {}) {
  const { body } = await adminResponse<T>(path, init);
  return (body && "data" in body ? body.data : body) as T;
}

export async function adminFetchPaged<T>(path: string): Promise<AdminPagedResult<T>> {
  const { body } = await adminResponse<T[]>(path);
  return {
    data: body?.data || [],
    meta: {
      page: Number(body?.meta?.page || 1),
      limit: Number(body?.meta?.limit || 20),
      total: Number(body?.meta?.total || 0),
    },
  };
}

export const adminClient = {
  session: () => adminFetch<import("@/types/admin").AdminSession>("/session"),
  runtime: () => adminFetch<import("@/types/admin").AdminRuntime>("/greedy/runtime"),
  configs: () => adminFetch<import("@/types/admin").AdminConfigVersion[]>("/greedy/configs"),
  createConfig: (payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch("/greedy/configs", { method: "POST", body: JSON.stringify(payload) }),
  config: (id: string) => adminFetch<import("@/types/admin").AdminConfigVersion>(`/greedy/configs/${id}`),
  updateConfig: (id: string, payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch(`/greedy/configs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  cloneConfig: (id: string) => adminFetch<import("@/types/admin").AdminConfigVersion>(`/greedy/configs/${id}/clone`, { method: "POST" }),
  validateConfig: (payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch<import("@/lib/admin-config-validation").ConfigValidationPreview>("/greedy/configs/validate", { method: "POST", body: JSON.stringify(payload) }),
  publish: (id: string) => adminFetch(`/greedy/configs/${id}/publish`, { method: "POST" }),
  publishApproved: (approvalId: string) => adminFetch("/greedy/configs/publish-approved", { method: "POST", body: JSON.stringify({ approval_id: approvalId }) }),
  resume: () => adminFetch("/greedy/resume", { method: "POST" }),
  pause: () => adminFetch("/greedy/pause", { method: "POST" }),
  cancel: (reason: string, approvalId?: string) => adminFetch<{ status?: string; approval_id?: string; round_id?: string; exposure?: string; expires_at?: string }>("/greedy/cancel-current-round", { method: "POST", body: JSON.stringify({ reason, ...(approvalId ? { approval_id: approvalId } : {}) }) }),
  adjustWallet: (payload: import("@/types/admin").WalletAdjustmentInput) => adminFetch<import("@/types/admin").WalletAdjustmentResult>("/wallets/adjust", { method: "POST", body: JSON.stringify(payload) }),
  wallets: (query = "?page=1&limit=20") => adminFetchPaged<import("@/types/admin").AdminWalletSearchItem>(`/wallets${query}`),
  overview: () => adminFetch("/greedy/overview"),
  health: () => adminFetch("/greedy/health"),
  metrics: (query = "") => adminFetch(`/greedy/metrics${query}`),
  rounds: (query = "?page=1&limit=20") => adminFetchPaged<import("@/types/admin").AdminRoundSummary>(`/greedy/rounds${query}`),
  round: (id: string) => adminFetch<import("@/types/admin").AdminRoundDetail>(`/greedy/rounds/${encodeURIComponent(id)}`),
  roundBets: (id: string, query = "?page=1&limit=20") => adminFetchPaged<import("@/types/admin").AdminRoundBet>(`/greedy/rounds/${encodeURIComponent(id)}/bets${query}`),
  verifyRound: (id: string) => adminFetch<import("@/types/admin").AdminRoundVerification>(`/greedy/rounds/${encodeURIComponent(id)}/result-verification`),
  player: (id: string) => adminFetch<import("@/types/admin").AdminPlayerSummary>(`/greedy/users/${encodeURIComponent(id)}`),
  auditLogs: (query = "?page=1&limit=50") => adminFetch(`/greedy/audit-logs${query}`),
  auditLogsPaged: (query = "?page=1&limit=50") => adminFetchPaged<import("@/types/admin").AdminAuditLog>(`/greedy/audit-logs${query}`),
  approvals: (query = "?page=1&limit=50") => adminFetch(`/approvals${query}`),
  approvalsPaged: (query = "?page=1&limit=100") => adminFetchPaged<import("@/types/admin").AdminApproval>(`/approvals${query}`),
  approve: (id: string, reason?: string) => adminFetch(`/approvals/${id}/approve`, { method: "POST", body: JSON.stringify({ reason }) }),
  reject: (id: string, reason?: string) => adminFetch(`/approvals/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  adminUsers: () => adminFetch<import("@/types/admin").AdminUserRecord[]>("/admin-users"),
  createAdminUser: (payload: unknown) => adminFetch("/admin-users", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminUser: (id: string, payload: unknown) => adminFetch(`/admin-users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  revokeAdminUserSessions: (id: string) => adminFetch(`/admin-users/${encodeURIComponent(id)}/revoke-sessions`, { method: "POST" }),
  resetAdminUserPassword: (id: string, password: string) => adminFetch(`/admin-users/${encodeURIComponent(id)}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  sessions: () => adminFetch<import("@/types/admin").AdminSessionRecord[]>("/auth/sessions"),
  revokeSession: (id: string) => adminFetch(`/auth/sessions/${encodeURIComponent(id)}/revoke`, { method: "POST" }),
  policy: () => adminFetch("/policy"),
  updatePolicy: (payload: unknown) => adminFetch("/policy", { method: "PATCH", body: JSON.stringify(payload) }),
  uploadAsset: (file: File) => { const data = new FormData(); data.append("file", file); return adminFetch<import("@/types/admin").AdminAsset>("/greedy/assets", { method: "POST", body: data }); },
  assets: () => adminFetch<import("@/types/admin").AdminAsset[]>("/greedy/assets"),
  alerts: (query = "?page=1&limit=50") => adminFetch(`/greedy/alerts${query}`),
  acknowledgeAlert: (id: string) => adminFetch(`/greedy/alerts/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),
  resolveAlert: (id: string) => adminFetch(`/greedy/alerts/${encodeURIComponent(id)}/resolve`, { method: "POST" }),
  setAvailability: (status: "active" | "maintenance" | "disabled") => adminFetch("/greedy/availability", { method: "POST", body: JSON.stringify({ status }) }),
  greedyClassic: {
    runtime: () => adminFetch<import("@/types/admin").AdminRuntime>("/greedy-classic/runtime"),
    configs: () => adminFetch<import("@/types/admin").AdminConfigVersion[]>("/greedy-classic/configs"),
    createConfig: (payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch("/greedy-classic/configs", { method: "POST", body: JSON.stringify(payload) }),
    config: (id: string) => adminFetch<import("@/types/admin").AdminConfigVersion>(`/greedy-classic/configs/${id}`),
    updateConfig: (id: string, payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch(`/greedy-classic/configs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    cloneConfig: (id: string) => adminFetch<import("@/types/admin").AdminConfigVersion>(`/greedy-classic/configs/${id}/clone`, { method: "POST" }),
    validateConfig: (payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch<import("@/lib/admin-config-validation").ConfigValidationPreview>("/greedy-classic/configs/validate", { method: "POST", body: JSON.stringify(payload) }),
    publish: (id: string) => adminFetch(`/greedy-classic/configs/${id}/publish`, { method: "POST" }),
    publishApproved: (approvalId: string) => adminFetch("/greedy-classic/configs/publish-approved", { method: "POST", body: JSON.stringify({ approval_id: approvalId }) }),
    resume: () => adminFetch("/greedy-classic/resume", { method: "POST" }),
    pause: () => adminFetch("/greedy-classic/pause", { method: "POST" }),
    cancel: (reason: string, approvalId?: string) => adminFetch<{ status?: string; approval_id?: string; round_id?: string; exposure?: string; expires_at?: string }>("/greedy-classic/cancel-current-round", { method: "POST", body: JSON.stringify({ reason, ...(approvalId ? { approval_id: approvalId } : {}) }) }),
    overview: () => adminFetch("/greedy-classic/overview"),
    health: () => adminFetch("/greedy-classic/health"),
    metrics: (query = "") => adminFetch(`/greedy-classic/metrics${query}`),
    rounds: (query = "?page=1&limit=20") => adminFetchPaged<import("@/types/admin").AdminRoundSummary>(`/greedy-classic/rounds${query}`),
    round: (id: string) => adminFetch<import("@/types/admin").AdminRoundDetail>(`/greedy-classic/rounds/${encodeURIComponent(id)}`),
    roundBets: (id: string, query = "?page=1&limit=20") => adminFetchPaged<import("@/types/admin").AdminRoundBet>(`/greedy-classic/rounds/${encodeURIComponent(id)}/bets${query}`),
    verifyRound: (id: string) => adminFetch<import("@/types/admin").AdminRoundVerification>(`/greedy-classic/rounds/${encodeURIComponent(id)}/result-verification`),
    player: (id: string) => adminFetch<import("@/types/admin").AdminPlayerSummary>(`/greedy-classic/users/${encodeURIComponent(id)}`),
    auditLogs: (query = "?page=1&limit=50") => adminFetch(`/greedy-classic/audit-logs${query}`),
    auditLogsPaged: (query = "?page=1&limit=50") => adminFetchPaged<import("@/types/admin").AdminAuditLog>(`/greedy-classic/audit-logs${query}`),
    uploadAsset: (file: File) => { const data = new FormData(); data.append("file", file); return adminFetch<import("@/types/admin").AdminAsset>("/greedy-classic/assets", { method: "POST", body: data }); },
    assets: () => adminFetch<import("@/types/admin").AdminAsset[]>("/greedy-classic/assets"),
    alerts: (query = "?page=1&limit=50") => adminFetch(`/greedy-classic/alerts${query}`),
    acknowledgeAlert: (id: string) => adminFetch(`/greedy-classic/alerts/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),
    resolveAlert: (id: string) => adminFetch(`/greedy-classic/alerts/${encodeURIComponent(id)}/resolve`, { method: "POST" }),
    setAvailability: (status: "active" | "maintenance" | "disabled") => adminFetch("/greedy-classic/availability", { method: "POST", body: JSON.stringify({ status }) }),
  },
  lucky77: {
    runtime: () => adminFetch<import("@/types/admin").AdminRuntime>("/lucky-77/runtime"),
    configs: () => adminFetch<import("@/types/admin").AdminConfigVersion[]>("/lucky-77/configs"),
    createConfig: (payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch("/lucky-77/configs", { method: "POST", body: JSON.stringify(payload) }),
    config: (id: string) => adminFetch<import("@/types/admin").AdminConfigVersion>(`/lucky-77/configs/${id}`),
    updateConfig: (id: string, payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch(`/lucky-77/configs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    cloneConfig: (id: string) => adminFetch<import("@/types/admin").AdminConfigVersion>(`/lucky-77/configs/${id}/clone`, { method: "POST" }),
    validateConfig: (payload: import("@/types/admin").CreateAdminConfigInput) => adminFetch<import("@/lib/admin-config-validation").ConfigValidationPreview>("/lucky-77/configs/validate", { method: "POST", body: JSON.stringify(payload) }),
    publish: (id: string) => adminFetch(`/lucky-77/configs/${id}/publish`, { method: "POST" }),
    publishApproved: (approvalId: string) => adminFetch("/lucky-77/configs/publish-approved", { method: "POST", body: JSON.stringify({ approval_id: approvalId }) }),
    resume: () => adminFetch("/lucky-77/resume", { method: "POST" }),
    pause: () => adminFetch("/lucky-77/pause", { method: "POST" }),
    uploadAsset: (file: File) => { const data = new FormData(); data.append("file", file); return adminFetch<import("@/types/admin").AdminAsset>("/lucky-77/assets", { method: "POST", body: data }); },
    assets: () => adminFetch<import("@/types/admin").AdminAsset[]>("/lucky-77/assets"),
  },
  teenPatti: {
    runtime: () =>
      adminFetch<import("@/types/admin").AdminRuntime>("/teen-patti/runtime"),
    configs: () =>
      adminFetch<import("@/types/admin").TeenPattiAdminConfigVersion[]>(
        "/teen-patti/configs",
      ),
    createConfig: (payload: import("@/types/admin").CreateTeenPattiAdminConfigInput) =>
      adminFetch("/teen-patti/configs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    config: (id: string) =>
      adminFetch<import("@/types/admin").TeenPattiAdminConfigVersion>(
        `/teen-patti/configs/${id}`,
      ),
    updateConfig: (
      id: string,
      payload: import("@/types/admin").CreateTeenPattiAdminConfigInput,
    ) =>
      adminFetch(`/teen-patti/configs/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    cloneConfig: (id: string) =>
      adminFetch<import("@/types/admin").TeenPattiAdminConfigVersion>(
        `/teen-patti/configs/${id}/clone`,
        { method: "POST" },
      ),
    validateConfig: (
      payload: import("@/types/admin").CreateTeenPattiAdminConfigInput,
    ) =>
      adminFetch<import("@/types/admin").TeenPattiConfigValidationPreview>(
        "/teen-patti/configs/validate",
        { method: "POST", body: JSON.stringify(payload) },
      ),
    publish: (id: string) =>
      adminFetch(`/teen-patti/configs/${id}/publish`, { method: "POST" }),
    publishApproved: (approvalId: string) =>
      adminFetch("/teen-patti/configs/publish-approved", {
        method: "POST",
        body: JSON.stringify({ approval_id: approvalId }),
      }),
    resume: () => adminFetch("/teen-patti/resume", { method: "POST" }),
    pause: () => adminFetch("/teen-patti/pause", { method: "POST" }),
    uploadAsset: (file: File) => {
      const data = new FormData();
      data.append("file", file);
      return adminFetch<import("@/types/admin").AdminAsset>(
        "/teen-patti/assets",
        { method: "POST", body: data },
      );
    },
  },
  platformApps: () =>
    adminFetch<import("@/types/admin").PlatformAppRecord[]>("/platform-apps"),
  platformApp: (id: string) =>
    adminFetch<import("@/types/admin").PlatformAppRecord>(
      `/platform-apps/${encodeURIComponent(id)}`,
    ),
  createPlatformApp: (payload: import("@/types/admin").CreatePlatformAppInput) =>
    adminFetch<import("@/types/admin").PlatformAppRecord>("/platform-apps", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePlatformApp: (
    id: string,
    payload: import("@/types/admin").UpdatePlatformAppInput,
  ) =>
    adminFetch<import("@/types/admin").PlatformAppRecord>(
      `/platform-apps/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),
  deletePlatformApp: (id: string) =>
    adminFetch(`/platform-apps/${encodeURIComponent(id)}`, { method: "DELETE" }),
  regeneratePlatformAppSigningSecret: (id: string) =>
    adminFetch<import("@/types/admin").PlatformAppRecord>(
      `/platform-apps/${encodeURIComponent(id)}/regenerate-signing-secret`,
      { method: "POST" },
    ),
  platformUsers: (query = "?page=1&limit=20") =>
    adminFetchPaged<import("@/types/admin").PlatformUserRecord>(`/platform-users${query}`),
  platformUser: (id: string) =>
    adminFetch<import("@/types/admin").PlatformUserRecord>(
      `/platform-users/${encodeURIComponent(id)}`,
    ),
  platformUserLedger: (id: string, query = "?page=1&limit=50") =>
    adminFetchPaged<import("@/types/admin").PlatformUserLedgerEntry>(
      `/platform-users/${encodeURIComponent(id)}/ledger${query}`,
    ),
  platformUserApps: () =>
    adminFetch<import("@/types/admin").PlatformAppFilterOption[]>("/platform-users/apps"),
};
