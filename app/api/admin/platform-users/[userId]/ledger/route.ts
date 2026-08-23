import { proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  const { userId } = await context.params;
  const query = new URL(request.url).search;
  return proxyAdminRequest(`/admin/platform-users/${encodeURIComponent(userId)}/ledger${query}`, session);
}
