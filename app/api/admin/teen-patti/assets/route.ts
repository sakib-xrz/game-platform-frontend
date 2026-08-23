import {
  forwardMutationHeaders,
  proxyAdminMultipart,
  proxyAdminRequest,
} from "@/lib/admin-bff";
import { requireAdminMutation, requireAdminSession } from "@/lib/admin-session";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof Response) return session;
  return proxyAdminRequest("/admin/games/teen-patti/assets", session);
}

export async function POST(request: Request) {
  const session = await requireAdminMutation(request);
  if (session instanceof Response) return session;
  const form = await request.formData();
  return proxyAdminMultipart(
    "/admin/games/teen-patti/assets",
    session,
    form,
    forwardMutationHeaders(request),
  );
}
