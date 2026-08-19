import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { sessionId } = await params;
  return proxyAdminRequest(`/admin/auth/sessions/${encodeURIComponent(sessionId)}/revoke`, session, { method: "POST", headers: forwardMutationHeaders(request) });
}
