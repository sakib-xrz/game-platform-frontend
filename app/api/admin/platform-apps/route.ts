import { forwardMutationHeaders, proxyAdminRequest, readJson } from "@/lib/admin-bff";
import { requireAdminMutation, requireAdminSession } from "@/lib/admin-session";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  return proxyAdminRequest("/admin/platform-apps", session);
}

export async function POST(request: Request) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  return proxyAdminRequest("/admin/platform-apps", session, {
    method: "POST",
    headers: forwardMutationHeaders(request),
    body: JSON.stringify(await readJson(request)),
  });
}
