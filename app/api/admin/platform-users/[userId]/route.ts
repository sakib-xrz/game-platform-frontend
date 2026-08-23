import { proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  const { userId } = await context.params;
  return proxyAdminRequest(`/admin/platform-users/${encodeURIComponent(userId)}`, session);
}
