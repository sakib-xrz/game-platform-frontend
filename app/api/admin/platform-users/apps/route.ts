import { proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  return proxyAdminRequest("/admin/platform-users/apps", session);
}
