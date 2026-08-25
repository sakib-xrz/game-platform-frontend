import { proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminSession } from "@/lib/admin-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;

  const { roundId } = await params;
  return proxyAdminRequest(
    `/admin/games/greedy-classic/rounds/${encodeURIComponent(roundId)}/result-verification`,
    session,
  );
}
