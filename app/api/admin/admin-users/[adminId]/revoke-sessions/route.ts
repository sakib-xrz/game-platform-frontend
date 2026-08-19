import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { adminId } = await params;
  return proxyAdminRequest(`/admin/admin-users/${encodeURIComponent(adminId)}/revoke-sessions`, session, { method: "POST", headers: forwardMutationHeaders(request) });
}
