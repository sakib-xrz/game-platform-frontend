import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const { appId } = await params;
  const body = await request.text();
  return proxyAdminRequest(
    `/admin/platform-apps/${encodeURIComponent(appId)}/generate-launch-url`,
    session,
    {
      method: "POST",
      headers: {
        ...forwardMutationHeaders(request),
        "Content-Type": "application/json",
      },
      body,
    },
  );
}
