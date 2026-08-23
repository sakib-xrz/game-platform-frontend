import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "__Host-admin_session";
export const DEV_ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_CSRF_COOKIE = "admin_csrf";

function sessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? ADMIN_SESSION_COOKIE
    : DEV_ADMIN_SESSION_COOKIE;
}
function secureCookie() {
  return process.env.NODE_ENV === "production";
}
export type AdminSession = { token: string };

export async function currentAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  return token ? { token } : null;
}
export async function requireAdminSession() {
  const session = await currentAdminSession();
  if (session) return session;
  return NextResponse.json(
    { message: "Admin authentication required" },
    { status: 401 },
  );
}
export async function requireAdminMutation(request: Request) {
  const session = await currentAdminSession();
  if (!session)
    return NextResponse.json(
      { message: "Admin authentication required" },
      { status: 401 },
    );
  const store = await cookies();
  const expected = store.get(ADMIN_CSRF_COOKIE)?.value;
  const supplied = request.headers.get("x-csrf-token");
  if (!expected || !supplied || expected !== supplied)
    return NextResponse.json(
      { message: "CSRF validation failed" },
      { status: 403 },
    );
  return session;
}
export function setSessionCookies(
  response: NextResponse,
  token: string,
  csrf: string,
  maxAge: number,
) {
  const options = {
    secure: secureCookie(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(1, Math.min(43_200, maxAge)),
  };
  response.cookies.set(sessionCookieName(), token, {
    ...options,
    httpOnly: true,
  });
  response.cookies.set(ADMIN_CSRF_COOKIE, csrf, {
    ...options,
    httpOnly: false,
  });
}
export function clearSessionCookies(response: NextResponse) {
  const options = {
    secure: secureCookie(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  response.cookies.set(sessionCookieName(), "", { ...options, httpOnly: true });
  response.cookies.set(ADMIN_CSRF_COOKIE, "", { ...options, httpOnly: false });
}
