import { forwardMutationHeaders, proxyAdminRequest, readJson } from "@/lib/admin-bff";
import { requireAdminMutation, requireAdminSession } from "@/lib/admin-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ configId: string }> },
) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  const { configId } = await params;
  return proxyAdminRequest(
    `/admin/games/lucky-77/config-versions/${encodeURIComponent(configId)}`,
    session,
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ configId: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { configId } = await params;
  const body = await readJson(request);
  if (!body) return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  return proxyAdminRequest(
    `/admin/games/lucky-77/config-versions/${encodeURIComponent(configId)}`,
    session,
    {
      method: "PUT",
      headers: forwardMutationHeaders(request),
      body: JSON.stringify(body),
    },
  );
}
