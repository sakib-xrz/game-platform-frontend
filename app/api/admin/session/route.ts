import { NextResponse } from "next/server";
import {
  clearSessionCookies,
  currentAdminSession,
  requireAdminMutation,
  setSessionCookies,
} from "@/lib/admin-session";
import {
  fetchAdminIdentity,
  forwardMutationHeaders,
  loginAdmin,
  newCsrfToken,
  proxyAdminRequest,
} from "@/lib/admin-bff";

export async function GET() {
  const session = await currentAdminSession();
  if (!session)
    return NextResponse.json(
      { message: "Admin authentication required" },
      { status: 401 },
    );
  const identity = await fetchAdminIdentity(session);
  if (!identity)
    return NextResponse.json(
      { message: "Admin session expired" },
      { status: 401 },
    );
  return NextResponse.json({
    success: true,
    data: { authenticated: true, actorId: identity.id, identity },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  if (!body?.email || !body.password)
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 },
    );
  try {
    const result = await loginAdmin({
      email: body.email.trim(),
      password: body.password,
    });
    const response = NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        actorId: result.identity.id,
        identity: result.identity,
      },
    });
    setSessionCookies(response, result.token, newCsrfToken(), result.maxAge);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Admin login failed",
      },
      { status: 401 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const backendResponse = await proxyAdminRequest(
    "/admin/auth/logout",
    session,
    { method: "POST", headers: forwardMutationHeaders(request) },
  );
  if (!backendResponse.ok) return backendResponse;
  const response = NextResponse.json(
    { success: true, data: null },
    {
      headers: {
        "x-request-id": backendResponse.headers.get("x-request-id") || "",
      },
    },
  );
  clearSessionCookies(response);
  return response;
}
