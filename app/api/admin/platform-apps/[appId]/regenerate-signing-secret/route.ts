import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { appId } = await params;
  return proxyAdminRequest(
    `/admin/platform-apps/${encodeURIComponent(appId)}/regenerate-signing-secret`,
    session,
    { method: "POST", headers: forwardMutationHeaders(request) },
  );
}
