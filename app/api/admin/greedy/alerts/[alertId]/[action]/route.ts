import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(request: Request, { params }: { params: Promise<{ alertId: string; action: string }> }) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { alertId, action } = await params;
  if (!/^(acknowledge|resolve)$/.test(action)) return Response.json({ message: "Invalid alert action" }, { status: 400 });
  return proxyAdminRequest(`/admin/games/greedy/alerts/${encodeURIComponent(alertId)}/${action}`, session, { method: "POST", headers: forwardMutationHeaders(request) });
}
