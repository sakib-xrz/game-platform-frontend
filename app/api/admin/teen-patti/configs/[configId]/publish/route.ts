import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ configId: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { configId } = await params;
  if (!/^[a-z0-9]+$/i.test(configId))
    return Response.json({ message: "Invalid config id" }, { status: 400 });
  return proxyAdminRequest(
    `/admin/games/teen-patti/config-versions/${encodeURIComponent(configId)}/publish`,
    session,
    { method: "POST", headers: forwardMutationHeaders(request) },
  );
}
