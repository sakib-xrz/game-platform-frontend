import { forwardMutationHeaders, proxyAdminRequest, readJson } from "@/lib/admin-bff";
import { requireAdminMutation, requireAdminSession } from "@/lib/admin-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  const { appId } = await params;
  return proxyAdminRequest(
    `/admin/platform-apps/${encodeURIComponent(appId)}`,
    session,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { appId } = await params;
  return proxyAdminRequest(
    `/admin/platform-apps/${encodeURIComponent(appId)}`,
    session,
    {
      method: "PATCH",
      headers: forwardMutationHeaders(request),
      body: JSON.stringify(await readJson(request)),
    },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { appId } = await params;
  return proxyAdminRequest(
    `/admin/platform-apps/${encodeURIComponent(appId)}`,
    session,
    { method: "DELETE", headers: forwardMutationHeaders(request) },
  );
}
