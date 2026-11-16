import { proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "daily";

  return proxyAdminRequest(
    `/admin/games/house-profit/overview?period=${encodeURIComponent(period)}`,
    session,
  );
}

