import { proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;

  const { roundId } = await params;
  const query = new URL(request.url).search;
  return proxyAdminRequest(
    `/admin/games/greedy-classic/rounds/${encodeURIComponent(roundId)}/bets${query}`,
    session,
  );
}
