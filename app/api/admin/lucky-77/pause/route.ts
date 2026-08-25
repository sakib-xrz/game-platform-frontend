import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(request: Request) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  return proxyAdminRequest("/admin/games/lucky-77/pause", session, {
    method: "POST",
    headers: forwardMutationHeaders(request),
  });
}
