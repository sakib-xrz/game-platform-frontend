import { proxyAdminRequest } from "@/lib/admin-bff"; import { requireAdminSession } from "@/lib/admin-session";
export async function GET(request: Request) { const session = await requireAdminSession(); if (session instanceof Response) return session; return proxyAdminRequest(`/admin/games/greedy/rounds${new URL(request.url).search}`, session); }
