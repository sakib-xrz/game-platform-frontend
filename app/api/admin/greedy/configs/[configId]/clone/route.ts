import { forwardMutationHeaders, proxyAdminRequest } from "@/lib/admin-bff";
import { requireAdminMutation } from "@/lib/admin-session";
export async function POST(request: Request, { params }: { params: Promise<{ configId: string }> }) { const session = await requireAdminMutation(request); if (session instanceof Response) return session; const { configId } = await params; return proxyAdminRequest(`/admin/games/greedy/config-versions/${encodeURIComponent(configId)}/clone`, session, { method: "POST", headers: forwardMutationHeaders(request) }); }
