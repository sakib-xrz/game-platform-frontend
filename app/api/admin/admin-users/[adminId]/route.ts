import { forwardMutationHeaders, proxyAdminRequest, readJson } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function PATCH(request: Request, { params }: { params: Promise<{ adminId: string }> }) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { adminId } = await params;
  return proxyAdminRequest(`/admin/admin-users/${encodeURIComponent(adminId)}`, session, { method: "PATCH", headers: forwardMutationHeaders(request), body: JSON.stringify(await readJson(request)) });
}
