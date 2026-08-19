import { forwardMutationHeaders, proxyAdminRequest, readJson } from "@/lib/admin-bff";
import { requireAdminMutation, requireAdminSession } from "@/lib/admin-session";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  return proxyAdminRequest("/admin/games/greedy/config-versions", session);
}

export async function POST(request: Request) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const body = await readJson(request);
  if (!body) return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  return proxyAdminRequest("/admin/games/greedy/config-versions", session, { method: "POST", headers: forwardMutationHeaders(request), body: JSON.stringify(body) });
}
