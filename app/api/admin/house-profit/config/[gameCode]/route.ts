import { forwardMutationHeaders, proxyAdminRequest, readJson } from "@/lib/admin-bff";
import { requireAdminMutation, requireAdminSession } from "@/lib/admin-session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ gameCode: string }> },
) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;

  const { gameCode } = await context.params;
  return proxyAdminRequest(
    `/admin/games/house-profit/config/${encodeURIComponent(gameCode)}`,
    session,
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ gameCode: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;

  const { gameCode } = await context.params;
  const body = await readJson(request);

  return proxyAdminRequest(
    `/admin/games/house-profit/config/${encodeURIComponent(gameCode)}`,
    session,
    {
      method: "PUT",
      headers: forwardMutationHeaders(request),
      body: JSON.stringify(body),
    },
  );
}

