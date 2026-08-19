import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { headers as incomingHeaders } from "next/headers";
import { NextResponse } from "next/server";
import type { AdminError } from "@/types/admin";
import type { AdminIdentity } from "@/types/admin";
import type { AdminSession } from "@/lib/admin-session";

const backendBase = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");
const authPath = process.env.ADMIN_AUTH_LOGIN_PATH || "/admin/auth/login";
type Envelope<T> = {
  data?: T;
  message?: string;
  success?: boolean;
  timestamp?: string;
  meta?: Record<string, unknown>;
};

async function backendFetch(
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const method = (init.method || "GET").toUpperCase();
  const isForm =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!isForm && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    !headers.has("Idempotency-Key")
  )
    headers.set("Idempotency-Key", randomUUID());
  const incoming = await incomingHeaders();
  const forwardedCandidate = (incoming.get("x-forwarded-for") || "")
    .split(",")[0]
    ?.trim();
  const realCandidate = incoming.get("x-real-ip")?.trim();
  const clientIp = [forwardedCandidate, realCandidate].find((value) =>
    Boolean(value && isIP(value)),
  );
  if (clientIp) headers.set("X-Forwarded-For", clientIp);
  const userAgent = incoming.get("user-agent")?.slice(0, 512);
  if (userAgent) headers.set("User-Agent", userAgent);
  if (!headers.has("X-Request-Id"))
    headers.set(
      "X-Request-Id",
      incoming.get("x-request-id")?.slice(0, 128) || randomUUID(),
    );
  return fetch(`${backendBase}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
}
export async function loginAdmin(credentials: {
  email: string;
  password: string;
}) {
  const response = await backendFetch(authPath, {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });
  const body = (await response.json().catch(() => null)) as Envelope<{
    session_token?: string;
    expires_at?: string;
    idle_expires_at?: string;
    session_id?: string;
    admin?: AdminIdentity;
  }> | null;
  if (!response.ok)
    throw new Error(body?.message || `Admin login failed (${response.status})`);
  const data = body?.data;
  const token = data?.session_token;
  if (!token) throw new Error("Admin login returned no session token");
  if (!data?.admin?.id)
    throw new Error("Admin login returned no administrator identity");
  const maxAge = Math.max(
    1,
    Math.min(
      60 * 60 * 12,
      data?.expires_at
        ? Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
        : 60 * 60 * 12,
    ),
  );
  return { token, maxAge, identity: data.admin };
}
export async function fetchAdminIdentity(session: AdminSession) {
  const response = await backendFetch("/admin/auth/me", {}, session.token);
  const body = (await response
    .json()
    .catch(() => null)) as Envelope<AdminIdentity> | null;
  if (!response.ok) return null;
  return body?.data || null;
}
export async function proxyAdminRequest(
  path: string,
  session: AdminSession,
  init: RequestInit = {},
) {
  try {
    const response = await backendFetch(path, init, session.token);
    const body = (await response
      .json()
      .catch(() => ({ message: "Invalid backend response" }))) as unknown;
    const headers = new Headers();
    const requestId = response.headers.get("x-request-id");
    if (requestId) headers.set("x-request-id", requestId);
    return NextResponse.json(body, { status: response.status, headers });
  } catch (error) {
    const body: AdminError = {
      message:
        error instanceof Error ? error.message : "Admin backend unavailable",
    };
    return NextResponse.json(body, { status: 502 });
  }
}
export async function proxyAdminMultipart(
  path: string,
  session: AdminSession,
  body: FormData,
  headers?: HeadersInit,
) {
  try {
    const response = await backendFetch(
      path,
      { method: "POST", body, headers },
      session.token,
    );
    const json = await response
      .json()
      .catch(() => ({ message: "Invalid backend response" }));
    const requestId = response.headers.get("x-request-id");
    return NextResponse.json(json, {
      status: response.status,
      headers: requestId ? { "x-request-id": requestId } : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Asset service unavailable",
      },
      { status: 502 },
    );
  }
}
export function newCsrfToken() {
  return randomBytes(24).toString("base64url");
}
export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
export function forwardMutationHeaders(request: Request): HeadersInit {
  return {
    "Idempotency-Key": request.headers.get("idempotency-key") || randomUUID(),
    "X-Request-Id": request.headers.get("x-request-id") || randomUUID(),
  };
}
